import 'server-only'

import type { LanguageModelUsage } from 'ai'
import type { Prisma } from '@prisma/client'

import { getConfiguredMaxOutputTokens, getDefaultAiProvider, hasDeepSeekApiKey } from '@/lib/ai'
import {
  buildAnalysisPlanningUserPrompt,
  getAnalysisPlanningSystemPrompt,
} from '@/lib/prompts/analysis-planning'
import {
  buildAnalysisSynthesisUserPrompt,
  getAnalysisSynthesisSystemPrompt,
} from '@/lib/prompts/analysis-synthesis'
import { scheduleRecordLlmUsage } from '@/lib/llm-usage'
import { prisma } from '@/lib/db'
import { withTracedRun } from '@/lib/insights/with-traced-run'
import { parseQueryPlan, type QueryPlanV1 } from '@/lib/reports/ast-schemas'
import { buildFieldCatalog, formatCatalogForPrompt } from '@/lib/reports/field-catalog'
import { fingerprintFromCatalog } from '@/lib/reports/fingerprint'
import {
  buildTrackerDataWhere,
  executeQueryPlan,
  resultSchemaFromRows,
  type TrackerDataInput,
} from '@/lib/reports/query-executor'
import { generateQueryPlanV1 } from '@/lib/reports/query-plan-agent'

import {
  analysisOutlinePayloadSchema,
  analysisDocumentFromModelSchema,
  analysisOutlineOnlySchema,
  parseAnalysisDocument,
  parseAnalysisDocumentFromModel,
  parseAnalysisOutlineOnly,
  type AnalysisDocumentV1,
  type AnalysisOutlineOnly,
  type AnalysisOutlinePayload,
} from './analysis-schemas'
import { hydrateChartDataForBlocks } from './chart-hydrate'
import {
  appendAnalysisRunEvent,
  createAnalysisRun,
  finishAnalysisRun,
  getAnalysisForUser,
  markAnalysisDefinitionError,
  saveAnalysisDefinitionArtifacts,
  updateAnalysisDefinitionPrompt,
} from './analysis-repository'
import { encodeNdjsonLine, type AnalysisStreamEvent } from './stream-events'

export type LoadedAnalysis = NonNullable<Awaited<ReturnType<typeof getAnalysisForUser>>>

type Forward = (event: AnalysisStreamEvent) => Promise<void>

async function loadTrackerRows(
  trackerSchemaId: string,
  plan: NonNullable<ReturnType<typeof parseQueryPlan>>,
): Promise<TrackerDataInput[]> {
  const where = buildTrackerDataWhere(trackerSchemaId, plan.load)
  const rows = await prisma.trackerData.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: plan.load.maxTrackerDataRows,
    select: {
      id: true,
      label: true,
      branchName: true,
      createdAt: true,
      updatedAt: true,
      data: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    branchName: r.branchName,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    data: r.data as Record<string, unknown>,
  }))
}

function buildProvenance(
  rawRows: Record<string, unknown>[],
  plan: QueryPlanV1,
  trackerSchemaId: string,
) {
  const ids = new Set<string>()
  for (const r of rawRows) {
    const id = r.__dataId
    if (typeof id === 'string') ids.add(id)
  }
  return {
    trackerSchemaId,
    resultRowCount: rawRows.length,
    load: plan.load,
    filterCount: plan.filter.length,
    aggregated: Boolean(plan.aggregate && plan.aggregate.metrics.length > 0),
    sampleTrackerDataIds: [...ids].slice(0, 15),
  }
}

function toOutlinePayload(outline: AnalysisOutlineOnly): AnalysisOutlinePayload {
  return { version: 1, narrative: outline.narrative, sections: outline.sections }
}

async function withRun(
  analysisId: string,
  trigger: 'initial' | 'refresh',
  writeNdjsonLine: (line: string) => Promise<void> | void,
  fn: (forward: Forward) => Promise<void>,
): Promise<void> {
  await withTracedRun<AnalysisStreamEvent>({
    writeNdjsonLine,
    encodeLine: encodeNdjsonLine,
    createRun: () => createAnalysisRun(analysisId, trigger),
    appendEvent: appendAnalysisRunEvent,
    finishRun: finishAnalysisRun,
    buildErrorEvent: (message) => ({ t: 'error', message }),
    fn,
  })
}

function recordUsage(
  userId: string,
  source: string,
  usage: LanguageModelUsage,
  projectId: string | null,
  trackerSchemaId: string | null,
  analysisId: string,
) {
  scheduleRecordLlmUsage({
    userId,
    source,
    usage,
    projectId,
    trackerSchemaId,
    analysisId,
  })
}

export function isAnalysisReplayable(analysis: LoadedAnalysis): boolean {
  const def = analysis.definition
  if (!def || def.status !== 'ready' || !def.queryPlan || !def.document || !def.outline || !def.schemaFingerprint) {
    return false
  }
  if (!parseQueryPlan(def.queryPlan) || !parseAnalysisDocument(def.document)) {
    return false
  }
  const outlineParse = analysisOutlinePayloadSchema.safeParse(def.outline)
  if (!outlineParse.success) return false
  const catalog = buildFieldCatalog(analysis.trackerSchema.schema)
  const fp = fingerprintFromCatalog(catalog)
  return fp === def.schemaFingerprint
}

export async function executeAnalysisReplay(params: {
  analysis: LoadedAnalysis
  writeNdjsonLine: (line: string) => Promise<void> | void
}): Promise<void> {
  const { analysis, writeNdjsonLine } = params
  const def = analysis.definition
  if (!def) throw new Error('Missing definition')

  const plan = parseQueryPlan(def.queryPlan)
  const savedDoc = parseAnalysisDocument(def.document)
  if (!plan || !savedDoc) throw new Error('Invalid saved analysis recipe')

  const trigger = def.status === 'draft' ? 'initial' : 'refresh'

  await withRun(analysis.id, trigger, writeNdjsonLine, async (forward) => {
    await forward({
      t: 'phase_start',
      phase: 'replay',
      label: 'Refreshing data (saved outline and narrative)',
    })
    await forward({
      t: 'phase_delta',
      phase: 'replay',
      text: 'Loading tracker rows and executing saved query plan…',
    })

    const trackerRows = await loadTrackerRows(analysis.trackerSchemaId, plan)
    const rawResult = executeQueryPlan(trackerRows, plan)
    const schema = resultSchemaFromRows(rawResult, 20)

    await forward({
      t: 'data_preview',
      rowCount: rawResult.length,
      columns: schema.columns.map((c) => c.key),
    })

    const stripped = savedDoc.blocks.map(({ chartData: _c, ...rest }) => rest)
    const hydratedBlocks = hydrateChartDataForBlocks(stripped, rawResult)
    const document: AnalysisDocumentV1 = { version: 1, blocks: hydratedBlocks }

    await forward({ t: 'phase_end', phase: 'replay', summary: 'Done.' })
    await forward({ t: 'final', document })

    await prisma.analysisDefinition.update({
      where: { analysisId: analysis.id },
      data: {
        document: document as unknown as Prisma.InputJsonValue,
        definitionVersion: { increment: 1 },
      },
    })
  })
}

export async function executeAnalysisFullGeneration(params: {
  userId: string
  analysis: LoadedAnalysis
  userPrompt: string
  writeNdjsonLine: (line: string) => Promise<void> | void
}): Promise<void> {
  const { analysis, userId, userPrompt, writeNdjsonLine } = params

  if (!hasDeepSeekApiKey()) {
    throw new Error('DEEPSEEK_API_KEY is not configured.')
  }

  const catalog = buildFieldCatalog(analysis.trackerSchema.schema)
  const catalogText = formatCatalogForPrompt(catalog)
  const fp = fingerprintFromCatalog(catalog)
  const projectId = analysis.projectId
  const trackerSchemaId = analysis.trackerSchemaId

  const provider = getDefaultAiProvider()
  const maxTokens = getConfiguredMaxOutputTokens()

  const def = analysis.definition
  const trigger = def?.status === 'draft' ? 'initial' : 'refresh'

  await withRun(analysis.id, trigger, writeNdjsonLine, async (forward) => {
    await updateAnalysisDefinitionPrompt(analysis.id, userPrompt)

    await forward({
      t: 'phase_start',
      phase: 'planning',
      label: 'Planning analysis (schema only)',
    })
    await forward({
      t: 'phase_delta',
      phase: 'planning',
      text: 'Agent 1: outline from catalog (no row data)…',
    })

    const planningResult = await provider.generateObject({
      system: getAnalysisPlanningSystemPrompt(),
      prompt: buildAnalysisPlanningUserPrompt({
        catalogText,
        userQuery: userPrompt,
      }),
      schema: analysisOutlineOnlySchema,
      maxOutputTokens: maxTokens,
    })
    recordUsage(userId, 'analysis-planning', planningResult.usage, projectId, trackerSchemaId, analysis.id)

    const outlineOnly = parseAnalysisOutlineOnly(planningResult.object)
    if (!outlineOnly) {
      throw new Error('Model returned an invalid planning result.')
    }

    const outlinePayload = toOutlinePayload(outlineOnly)

    await forward({
      t: 'artifact',
      phase: 'planning',
      kind: 'outline',
      data: outlinePayload,
    })
    await forward({
      t: 'phase_end',
      phase: 'planning',
      summary: outlineOnly.narrative,
    })

    await forward({ t: 'phase_start', phase: 'query_plan', label: 'Building query plan' })
    await forward({
      t: 'phase_delta',
      phase: 'query_plan',
      text: 'Mapping outline to safe query AST…',
    })

    const { queryPlan, usage: queryPlanUsage } = await generateQueryPlanV1({
      provider,
      maxOutputTokens: maxTokens,
      userPromptContext: {
        mode: 'analysis',
        outline: outlinePayload,
        catalogText,
        userQuery: userPrompt,
      },
    })
    recordUsage(userId, 'analysis-query-plan', queryPlanUsage, projectId, trackerSchemaId, analysis.id)

    await forward({
      t: 'artifact',
      phase: 'query_plan',
      kind: 'query_plan',
      data: queryPlan,
    })
    await forward({ t: 'phase_end', phase: 'query_plan', summary: 'Query plan ready.' })

    await forward({ t: 'phase_start', phase: 'execute', label: 'Running query' })
    await forward({
      t: 'phase_delta',
      phase: 'execute',
      text: 'Fetching tracker data…',
    })

    const trackerRows = await loadTrackerRows(analysis.trackerSchemaId, queryPlan)
    const rawResult = executeQueryPlan(trackerRows, queryPlan)
    const preSchema = resultSchemaFromRows(rawResult, 25)

    await forward({
      t: 'data_preview',
      rowCount: rawResult.length,
      columns: preSchema.columns.map((c) => c.key),
    })
    await forward({
      t: 'phase_end',
      phase: 'execute',
      summary: `${rawResult.length} row(s) after query plan.`,
    })

    const provenance = buildProvenance(rawResult, queryPlan, trackerSchemaId)

    await forward({
      t: 'phase_start',
      phase: 'synthesis',
      label: 'Writing analysis',
    })
    await forward({
      t: 'phase_delta',
      phase: 'synthesis',
      text: 'Agent 2: prose, charts, and sources from data + plan…',
    })

    const synthResult = await provider.generateObject({
      system: getAnalysisSynthesisSystemPrompt(),
      prompt: buildAnalysisSynthesisUserPrompt({
        userQuery: userPrompt,
        outlineJson: JSON.stringify(outlinePayload, null, 2),
        provenanceJson: JSON.stringify(provenance, null, 2),
        columnsJson: JSON.stringify(preSchema.columns.map((c) => c.key)),
        sampleRowsJson: JSON.stringify(preSchema.sample.slice(0, 20), null, 2),
      }),
      schema: analysisDocumentFromModelSchema,
      maxOutputTokens: maxTokens,
    })
    recordUsage(userId, 'analysis-synthesis', synthResult.usage, projectId, trackerSchemaId, analysis.id)

    const docParsed = parseAnalysisDocumentFromModel(synthResult.object)
    if (!docParsed) {
      throw new Error('Model returned an invalid analysis document.')
    }

    const hydratedBlocks = hydrateChartDataForBlocks(docParsed.blocks, rawResult)
    const document: AnalysisDocumentV1 = { version: 1, blocks: hydratedBlocks }

    await forward({
      t: 'artifact',
      phase: 'synthesis',
      kind: 'document',
      data: document,
    })
    await forward({ t: 'phase_end', phase: 'synthesis', summary: `${document.blocks.length} section(s).` })
    await forward({ t: 'final', document })

    await saveAnalysisDefinitionArtifacts({
      analysisId: analysis.id,
      userPrompt,
      outline: outlinePayload,
      queryPlan,
      document,
      schemaFingerprint: fp,
      status: 'ready',
      lastError: null,
    })
  })
}

export async function runAnalysisPipeline(params: {
  userId: string
  analysisId: string
  userPrompt: string
  regenerate: boolean
  writeNdjsonLine: (line: string) => Promise<void> | void
}): Promise<void> {
  const analysis = await getAnalysisForUser(params.analysisId, params.userId)
  if (!analysis) {
    throw new Error('Analysis not found.')
  }

  const prompt =
    params.userPrompt.trim() || analysis.definition?.userPrompt?.trim() || ''
  const replayable = isAnalysisReplayable(analysis) && !params.regenerate

  if (!prompt && !replayable) {
    throw new Error('Prompt is required for the first generation.')
  }

  try {
    if (replayable) {
      await executeAnalysisReplay({
        analysis,
        writeNdjsonLine: params.writeNdjsonLine,
      })
    } else {
      if (!prompt) {
        throw new Error('Prompt is required.')
      }
      await executeAnalysisFullGeneration({
        userId: params.userId,
        analysis,
        userPrompt: prompt,
        writeNdjsonLine: params.writeNdjsonLine,
      })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed'
    if (!replayable) {
      await markAnalysisDefinitionError(params.analysisId, message)
    }
    throw e
  }
}
