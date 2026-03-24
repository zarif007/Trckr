import 'server-only'

import type { LanguageModelUsage } from 'ai'

import type { StructuredAiProvider } from '@/lib/ai/provider'
import {
  buildReportQueryPlanUserPrompt,
  getReportQueryPlanSystemPrompt,
} from '@/lib/prompts/report-query-plan'
import type { ReportIntent } from '@/lib/reports/report-schemas'

import { parseQueryPlan, queryPlanV1Schema, type QueryPlanV1 } from './schemas'

/**
 * Analysis outline shape for the shared query-plan LLM (mirrors `AnalysisOutlinePayload` in `lib/analysis`).
 */
export type AnalysisOutlineForQueryPlan = {
  version: 1
  narrative: string
  sections: Array<{
    id: string
    title: string
    kind: 'narrative' | 'chart' | 'callout'
    focus: string
    chartHint?: 'bar' | 'line' | 'area' | 'pie' | 'gantt' | 'none'
  }>
}

export type QueryPlanUserContext =
  | {
      mode: 'report'
      intent: ReportIntent
      userQuery: string
      catalogText: string
      trackerInstance: 'SINGLE' | 'MULTI'
      versionControl: boolean
    }
  | {
      mode: 'analysis'
      outline: AnalysisOutlineForQueryPlan
      userQuery: string
      catalogText: string
    }

export function buildQueryPlanUserPrompt(ctx: QueryPlanUserContext): string {
  if (ctx.mode === 'report') {
    return buildReportQueryPlanUserPrompt({
      intent: ctx.intent,
      catalogText: ctx.catalogText,
      userQuery: ctx.userQuery,
      trackerInstance: ctx.trackerInstance,
      versionControl: ctx.versionControl,
    })
  }
  return `## Field catalog
${ctx.catalogText}

## User goal
${ctx.userQuery}

## Analysis outline (JSON — build one query plan that loads data for all sections)
${JSON.stringify(ctx.outline, null, 2)}`
}

export type GenerateQueryPlanV1Result = {
  queryPlan: QueryPlanV1
  usage: LanguageModelUsage
}

/**
 * Single LLM call producing `QueryPlanV1` for reports and analyses.
 */
export async function generateQueryPlanV1(params: {
  provider: StructuredAiProvider
  maxOutputTokens: number
  userPromptContext: QueryPlanUserContext
}): Promise<GenerateQueryPlanV1Result> {
  const result = await params.provider.generateObject({
    system: getReportQueryPlanSystemPrompt(),
    prompt: buildQueryPlanUserPrompt(params.userPromptContext),
    schema: queryPlanV1Schema,
    maxOutputTokens: params.maxOutputTokens,
  })
  const queryPlan = parseQueryPlan(result.object)
  if (!queryPlan) {
    throw new Error('Model returned an invalid query plan.')
  }
  return { queryPlan, usage: result.usage }
}
