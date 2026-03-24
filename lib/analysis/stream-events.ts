import type { AnalysisDocumentV1 } from './analysis-schemas'

/** NDJSON payloads written by the analysis orchestrator and API. */
export type AnalysisStreamEvent =
  | { t: 'phase_start'; phase: string; label: string }
  | { t: 'phase_delta'; phase: string; text: string }
  | { t: 'phase_end'; phase: string; summary?: string }
  | {
      t: 'artifact'
      phase: string
      kind: 'outline' | 'query_plan' | 'document'
      data: unknown
    }
  | { t: 'data_preview'; rowCount: number; columns: string[] }
  | { t: 'final'; document: AnalysisDocumentV1 }
  | { t: 'error'; message: string }

export function encodeNdjsonLine(event: AnalysisStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}
