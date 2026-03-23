import 'server-only'

import type { LanguageModelUsage } from 'ai'

import { getConfiguredMaxOutputTokens, getDefaultAiProvider, hasDeepSeekApiKey } from '@/lib/ai'
import { buildReportCalcUserPrompt, getReportCalcSystemPrompt } from '@/lib/prompts/report-calc'
import { buildReportFormatterUserPrompt, getReportFormatterSystemPrompt } from '@/lib/prompts/report-formatter'
import { buildReportIntentUserPrompt, getReportIntentSystemPrompt } from '@/lib/prompts/report-intent'
import {
  buildReportQueryPlanUserPrompt,
  getReportQueryPlanSystemPrompt,
} from '@/lib/prompts/report-query-plan'
import { scheduleRecordLlmUsage } from '@/lib/llm-usage'
import { prisma } from '@/lib/db'

import {
  type QueryPlanV1,
  type ReportIntent,
  formatterPlanV1Schema,
  parseFormatterPlan,
  parseQueryPlan,
  queryPlanV1Schema,
  reportIntentSchema,
} from './ast-schemas'
import {
  applyCalcPlanToRows,
  emptyCalcPlan,
  parseCalcPlan,
  type ReportCalcIntent,
  reportCalcIntentSchema,
} from './calc-plan'
import { buildFieldCatalog, formatCatalogForPrompt } from './field-catalog'
import { fingerprintFromCatalog } from './fingerprint'
import {
  applyFormatterPlan,
  formatOutputMarkdown,
} from './formatter-engine'
import {
  buildTrackerDataWhere,
  executeQueryPlan,
  resultSchemaFromRows,
  type TrackerDataInput,
} from './query-executor'
import {
  appendReportRunEvent,
  createReportRun,
  finishReportRun,
  getReportForUser,
  markDefinitionError,
  saveDefinitionArtifacts,
  updateDefinitionPrompt,
} from './report-repository'
import { generateReportExprAst } from './report-generate-expr'
import { encodeNdjsonLine, type ReportStreamEvent } from './stream-events'

export type LoadedReport = NonNullable<Awaited<ReturnType<typeof getReportForUser>>>

function primaryGridIdForReport(
  intent: ReportIntent,
  rawRows: Record<string, unknown>[],
  catalogGridIds: string[],
): string {
  const fromIntent = intent.gridIds[0]
  if (fromIntent) return fromIntent
  const fromRow = rawRows.find((r) => typeof r.__gridId === 'string')?.__gridId
  if (typeof fromRow === 'string' && fromRow) return fromRow
  return catalogGridIds[0] ?? ''
}

export function isReplayable(report: LoadedReport): boolean {
  const def = report.definition
  if (!def || def.status !== 'ready' || !def.queryPlan || !def.formatterPlan || !def.schemaFingerprint) {
    return false
  }
  if (def.calcPlan != null && parseCalcPlan(def.calcPlan) == null) {
    return false
  }
  const catalog = buildFieldCatalog(report.trackerSchema.schema)
  const fp = fingerprintFromCatalog(catalog)
  if (fp !== def.schemaFingerprint) return false
  return !!(parseQueryPlan(def.queryPlan) && parseFormatterPlan(def.formatterPlan))
}

type Forward = (event: ReportStreamEvent) => Promise<void>

async function withRun(
  reportId: string,
  trigger: 'initial' | 'refresh',
  writeNdjsonLine: (line: string) => Promise<void> | void,
  fn: (forward: Forward) => Promise<void>,
): Promise<void> {
  const run = await createReportRun(reportId, trigger)
  let seq = 0
  const forward: Forward = async (event) => {
    await writeNdjsonLine(encodeNdjsonLine(event))
    await appendReportRunEvent(run.id, seq, event)
    seq += 1
  }
  try {
    await fn(forward)
    await finishReportRun(run.id, 'completed')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Report run failed'
    await forward({ t: 'error', message })
    await finishReportRun(run.id, 'failed')
    throw e
  }
}

function recordUsage(
  userId: string,
  source: string,
  usage: LanguageModelUsage,
  projectId: string | null,
  trackerSchemaId: string | null,
  reportId: string,
) {
  scheduleRecordLlmUsage({
    userId,
    source,
    usage,
    projectId,
    trackerSchemaId,
    reportId,
  })
}

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

function buildMarkdownPreamble(intent: ReportIntent | null, userPrompt: string): string {
  if (intent?.narrative) {
    return `## ${intent.narrative}\n\n`
  }
  if (userPrompt) {
    return `## Report\n\n_${userPrompt}_\n\n`
  }
  return ''
}

export async function executeReportReplay(params: {
  report: LoadedReport
  writeNdjsonLine: (line: string) => Promise<void> | void
  /** When set (e.g. after merging client overrides), used instead of `definition.queryPlan`. */
  queryPlan?: QueryPlanV1
}): Promise<void> {
  const { report, writeNdjsonLine, queryPlan: queryPlanParam } = params
  const def = report.definition
  if (!def) throw new Error('Missing definition')

  const plan = queryPlanParam ?? parseQueryPlan(def.queryPlan)
  const fmt = parseFormatterPlan(def.formatterPlan)
  if (!plan || !fmt) throw new Error('Invalid saved recipe')

  const trigger = def.status === 'draft' ? 'initial' : 'refresh'

  await withRun(report.id, trigger, writeNdjsonLine, async (forward) => {
    await forward({
      t: 'phase_start',
      phase: 'replay',
      label: 'Running saved query and formatter (no AI)',
    })
    await forward({
      t: 'phase_delta',
      phase: 'replay',
      text: 'Loading tracker rows and executing query plan…',
    })

    const trackerRows = await loadTrackerRows(report.trackerSchemaId, plan)
    const rawResult = executeQueryPlan(trackerRows, plan)
    const effectiveCalc =
      def.calcPlan == null ? emptyCalcPlan() : parseCalcPlan(def.calcPlan)
    if (def.calcPlan != null && effectiveCalc == null) {
      throw new Error('Invalid saved calculation plan.')
    }
    const afterCalc = applyCalcPlanToRows(rawResult, effectiveCalc)
    const formattedRows = applyFormatterPlan(afterCalc, fmt)
    const schema = resultSchemaFromRows(afterCalc, 20)

    await forward({
      t: 'data_preview',
      rowCount: formattedRows.length,
      columns: schema.columns.map((c) => c.key),
    })

    await forward({
      t: 'phase_delta',
      phase: 'replay',
      text: 'Applying saved calculations and formatter…',
    })

    const preambleMarkdown = buildMarkdownPreamble(null, def.userPrompt)
    const md =
      preambleMarkdown +
      formatOutputMarkdown(formattedRows, fmt.outputStyle ?? 'markdown_table')

    await forward({ t: 'phase_end', phase: 'replay', summary: 'Done.' })
    await forward({
      t: 'final',
      markdown: md,
      preambleMarkdown,
      tableRows: formattedRows,
    })
  })
}

export async function executeReportFullGeneration(params: {
  userId: string
  report: LoadedReport
  userPrompt: string
  writeNdjsonLine: (line: string) => Promise<void> | void
}): Promise<void> {
  const { report, userId, userPrompt, writeNdjsonLine } = params

  if (!hasDeepSeekApiKey()) {
    throw new Error('DEEPSEEK_API_KEY is not configured.')
  }

  const catalog = buildFieldCatalog(report.trackerSchema.schema)
  const catalogText = formatCatalogForPrompt(catalog)
  const fp = fingerprintFromCatalog(catalog)
  const projectId = report.projectId
  const trackerSchemaId = report.trackerSchemaId

  const provider = getDefaultAiProvider()
  const maxTokens = getConfiguredMaxOutputTokens()

  const def = report.definition
  const trigger = def?.status === 'draft' ? 'initial' : 'refresh'

  await withRun(report.id, trigger, writeNdjsonLine, async (forward) => {
    await updateDefinitionPrompt(report.id, userPrompt)

    await forward({ t: 'phase_start', phase: 'intent', label: 'Understanding your request' })
    await forward({
      t: 'phase_delta',
      phase: 'intent',
      text: 'Parsing intent (fields, time range, metrics)…',
    })

    const intentResult = await provider.generateObject<ReportIntent>({
      system: getReportIntentSystemPrompt(),
      prompt: buildReportIntentUserPrompt({ userQuery: userPrompt, catalogText }),
      schema: reportIntentSchema,
      maxOutputTokens: maxTokens,
    })
    recordUsage(userId, 'report-intent', intentResult.usage, projectId, trackerSchemaId, report.id)

    const intent = intentResult.object
    await forward({ t: 'artifact', phase: 'intent', kind: 'intent', data: intent })
    await forward({ t: 'phase_end', phase: 'intent', summary: intent.narrative })

    await forward({ t: 'phase_start', phase: 'query_plan', label: 'Building query plan' })
    await forward({ t: 'phase_delta', phase: 'query_plan', text: 'Mapping to safe query AST…' })

    const queryResult = await provider.generateObject({
      system: getReportQueryPlanSystemPrompt(),
      prompt: buildReportQueryPlanUserPrompt({
        intent,
        catalogText,
        userQuery: userPrompt,
      }),
      schema: queryPlanV1Schema,
      maxOutputTokens: maxTokens,
    })
    recordUsage(userId, 'report-query-plan', queryResult.usage, projectId, trackerSchemaId, report.id)

    const queryPlan = parseQueryPlan(queryResult.object)
    if (!queryPlan) {
      throw new Error('Model returned an invalid query plan.')
    }

    await forward({
      t: 'artifact',
      phase: 'query_plan',
      kind: 'query_plan',
      data: queryPlan,
    })
    await forward({ t: 'phase_end', phase: 'query_plan', summary: 'Query plan validated.' })

    await forward({ t: 'phase_start', phase: 'execute', label: 'Running query' })
    await forward({
      t: 'phase_delta',
      phase: 'execute',
      text: 'Fetching tracker data and applying filters…',
    })

    const trackerRows = await loadTrackerRows(report.trackerSchemaId, queryPlan)
    const rawResult = executeQueryPlan(trackerRows, queryPlan)
    const preCalcSchema = resultSchemaFromRows(rawResult, 20)

    await forward({
      t: 'data_preview',
      rowCount: rawResult.length,
      columns: preCalcSchema.columns.map((c) => c.key),
    })
    await forward({
      t: 'phase_end',
      phase: 'execute',
      summary: `${rawResult.length} row(s) after query plan.`,
    })

    await forward({ t: 'phase_start', phase: 'calc', label: 'Derived columns' })
    await forward({
      t: 'phase_delta',
      phase: 'calc',
      text: 'Checking whether extra per-row calculations are needed…',
    })

    const preCalcSampleJson = JSON.stringify(preCalcSchema.sample.slice(0, 15), null, 2)
    const calcIntentResult = await provider.generateObject<ReportCalcIntent>({
      system: getReportCalcSystemPrompt(),
      prompt: buildReportCalcUserPrompt({
        intentSummary: intent.narrative,
        userQuery: userPrompt,
        columnKeys: preCalcSchema.columns.map((c) => c.key),
        sampleRowsJson: preCalcSampleJson,
      }),
      schema: reportCalcIntentSchema,
      maxOutputTokens: maxTokens,
    })
    recordUsage(userId, 'report-calc-intent', calcIntentResult.usage, projectId, trackerSchemaId, report.id)

    let calcPlan = emptyCalcPlan()
    const primaryGrid = primaryGridIdForReport(intent, rawResult, catalog.gridIds)
    if (calcIntentResult.object.columns.length > 0) {
      if (!primaryGrid) {
        await forward({
          t: 'phase_delta',
          phase: 'calc',
          text: 'Could not determine a primary grid; skipping expression generation.',
        })
      } else {
        const built: { name: string; expr: unknown }[] = []
        for (const spec of calcIntentResult.object.columns) {
          await forward({
            t: 'phase_delta',
            phase: 'calc',
            text: `Generating expression for column \`${spec.name}\`…`,
          })
          const gen = await generateReportExprAst({
            prompt: `${spec.name}: ${spec.instruction}`,
            trackerSchema: report.trackerSchema.schema,
            primaryGridId: primaryGrid,
            fieldId: `report.calc.${spec.name}`,
          })
          recordUsage(userId, 'report-calc-expr', gen.usage, projectId, trackerSchemaId, report.id)
          built.push({ name: spec.name, expr: gen.expr })
        }
        calcPlan = { version: 1, columns: built }
      }
    }

    const enrichedRows = applyCalcPlanToRows(rawResult, calcPlan)
    const schema = resultSchemaFromRows(enrichedRows, 20)

    await forward({
      t: 'artifact',
      phase: 'calc',
      kind: 'calc_plan',
      data: calcPlan,
    })
    await forward({
      t: 'phase_end',
      phase: 'calc',
      summary:
        calcPlan.columns.length > 0
          ? `${calcPlan.columns.length} derived column(s).`
          : 'No derived columns.',
    })

    await forward({
      t: 'data_preview',
      rowCount: enrichedRows.length,
      columns: schema.columns.map((c) => c.key),
    })

    await forward({ t: 'phase_start', phase: 'formatter', label: 'Formatting' })
    await forward({
      t: 'phase_delta',
      phase: 'formatter',
      text: 'Building display formatter (ops over schema + sample)…',
    })

    const sampleJson = JSON.stringify(schema.sample.slice(0, 15), null, 2)
    const fmtResult = await provider.generateObject({
      system: getReportFormatterSystemPrompt(),
      prompt: buildReportFormatterUserPrompt({
        intentSummary: intent.narrative,
        userQuery: userPrompt,
        columns: schema.columns,
        sampleRowsJson: sampleJson,
      }),
      schema: formatterPlanV1Schema,
      maxOutputTokens: maxTokens,
    })
    recordUsage(userId, 'report-formatter-plan', fmtResult.usage, projectId, trackerSchemaId, report.id)

    const formatterPlan = parseFormatterPlan(fmtResult.object)
    if (!formatterPlan) {
      throw new Error('Model returned an invalid formatter plan.')
    }

    await forward({
      t: 'artifact',
      phase: 'formatter',
      kind: 'formatter_plan',
      data: formatterPlan,
    })
    await forward({ t: 'phase_end', phase: 'formatter', summary: 'Formatter plan validated.' })

    await forward({ t: 'phase_start', phase: 'apply', label: 'Applying formatter' })
    const formattedRows = applyFormatterPlan(enrichedRows, formatterPlan)
    const preambleMarkdown = buildMarkdownPreamble(intent, userPrompt)
    const md =
      preambleMarkdown +
      formatOutputMarkdown(formattedRows, formatterPlan.outputStyle ?? 'markdown_table')
    await forward({
      t: 'phase_end',
      phase: 'apply',
      summary: `${formattedRows.length} row(s) for display.`,
    })

    await forward({
      t: 'final',
      markdown: md,
      preambleMarkdown,
      tableRows: formattedRows,
    })

    await saveDefinitionArtifacts({
      reportId: report.id,
      userPrompt,
      intent,
      queryPlan,
      calcPlan,
      formatterPlan,
      schemaFingerprint: fp,
      status: 'ready',
      lastError: null,
    })
  })
}

export async function runReportPipeline(params: {
  userId: string
  reportId: string
  userPrompt: string
  regenerate: boolean
  /** When replaying, merged into the stored query plan before execution (validated by caller). */
  replayQueryPlan?: QueryPlanV1
  writeNdjsonLine: (line: string) => Promise<void> | void
}): Promise<void> {
  const report = await getReportForUser(params.reportId, params.userId)
  if (!report) {
    throw new Error('Report not found.')
  }

  const prompt =
    params.userPrompt.trim() || report.definition?.userPrompt?.trim() || ''
  const replayable = isReplayable(report) && !params.regenerate

  if (!prompt && !replayable) {
    throw new Error('Prompt is required for the first generation.')
  }

  try {
    if (replayable) {
      await executeReportReplay({
        report,
        writeNdjsonLine: params.writeNdjsonLine,
        queryPlan: params.replayQueryPlan,
      })
    } else {
      if (!prompt) {
        throw new Error('Prompt is required.')
      }
      await executeReportFullGeneration({
        userId: params.userId,
        report,
        userPrompt: prompt,
        writeNdjsonLine: params.writeNdjsonLine,
      })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Report failed'
    if (!replayable) {
      await markDefinitionError(params.reportId, message)
    }
    throw e
  }
}
