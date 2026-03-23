/** NDJSON payloads written by the report orchestrator and API. */

export type ReportStreamEvent =
  | { t: 'phase_start'; phase: string; label: string }
  | { t: 'phase_delta'; phase: string; text: string }
  | { t: 'phase_end'; phase: string; summary?: string }
  | {
      t: 'artifact'
      phase: string
      kind: 'intent' | 'query_plan' | 'formatter_plan' | 'calc_plan'
      data: unknown
    }
  | { t: 'data_preview'; rowCount: number; columns: string[] }
  | {
      t: 'final'
      markdown: string
      /** Prose heading only; use with `tableRows` for rich table UI without duplicating markdown tables. */
      preambleMarkdown?: string
      tableRows?: Record<string, unknown>[]
    }
  | { t: 'error'; message: string }

export function encodeNdjsonLine(event: ReportStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}
