import 'server-only'

import type { LanguageModelUsage } from 'ai'

import type { StructuredAiProvider } from '@/lib/ai/provider'
import {
  buildReportQueryPlanUserPrompt,
  getReportQueryPlanSystemPrompt,
} from '@/lib/prompts/report-query-plan'

import { parseQueryPlan, queryPlanV1Schema, type QueryPlanV1, type ReportIntent } from './ast-schemas'

/**
 * Analysis outline shape needed to build a user message for the shared query-plan LLM.
 * Matches {@link AnalysisOutlinePayload} in `lib/analysis` without importing that module
 * (keeps `lib/reports` free of a dependency on `lib/analysis`).
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
  | { mode: 'report'; intent: ReportIntent; userQuery: string; catalogText: string }
  | {
      mode: 'analysis'
      outline: AnalysisOutlineForQueryPlan
      userQuery: string
      catalogText: string
    }

/**
 * User message for the query-plan model. Report mode delegates to the existing report prompt;
 * analysis mode supplies the outline JSON so one shared system prompt (`getReportQueryPlanSystemPrompt`)
 * governs all `QueryPlanV1` output.
 *
 * See `lib/insights/README.md` for pipeline overview.
 */
export function buildQueryPlanUserPrompt(ctx: QueryPlanUserContext): string {
  if (ctx.mode === 'report') {
    return buildReportQueryPlanUserPrompt({
      intent: ctx.intent,
      catalogText: ctx.catalogText,
      userQuery: ctx.userQuery,
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
 * Single LLM call that produces a validated `QueryPlanV1`, shared by Report and Analysis pipelines.
 * Uses {@link getReportQueryPlanSystemPrompt} as the only source of query AST rules.
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
