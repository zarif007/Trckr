/**
 * NDJSON event protocol for the multi-agent report generation stream.
 *
 * The event shapes for phase_start, phase_delta, phase_end, artifact,
 * data_preview, final, and error are backwards-compatible with the
 * existing UI consumer (app/insights/lib/ndjson-timeline.ts).
 *
 * Agent-specific streaming events (*_partial, *_complete) are additive
 * and silently ignored by the current UI.
 */

export type ReportStreamEvent =
  // Phase lifecycle (backwards-compatible with ndjson-timeline.ts)
  | { t: "phase_start"; phase: string; label: string }
  | { t: "phase_delta"; phase: string; text: string }
  | { t: "phase_end"; phase: string; summary?: string }
  | { t: "artifact"; phase: string; kind: "intent" | "query_plan" | "formatter_plan" | "calc_plan"; data: unknown }
  | { t: "data_preview"; rowCount: number; columns: string[] }
  | {
      t: "final";
      markdown: string;
      preambleMarkdown?: string;
      tableRows?: Record<string, unknown>[];
    }
  | { t: "error"; message: string }

  // Agent-specific streaming events (additive; current UI ignores unknown types)
  | { t: "architect_partial"; partial: unknown }
  | { t: "architect_complete"; intent: unknown }
  | { t: "query_partial"; partial: unknown }
  | { t: "query_complete"; queryPlan: unknown }
  | { t: "data_complete"; rowCount: number; columns: string[]; sampleRows: Record<string, unknown>[] }
  | { t: "calc_partial"; partial: { name: string; instruction: string }[] }
  | { t: "calc_complete"; calcPlan: unknown; columnsAdded: number }
  | { t: "formatter_partial"; partial: unknown }
  | { t: "formatter_complete"; outputStyle: string; rowCount: number };

export function encodeNdjsonLine(event: ReportStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
