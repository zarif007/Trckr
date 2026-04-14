import type { AnalysisDocumentV1 } from "./analysis-schemas";
import type { AnalysisStreamEvent } from "./stream-events";
import { ANALYSIS_STREAM_TABLE_ROW_CAP } from "./constants";

/**
 * Caps `tableRows` on the wire and in traced run storage so huge aggregates
 * cannot OOM the Node process, Prisma JSON columns, or the browser JSON parse.
 */
export function buildFinalAnalysisStreamEvent(params: {
  document: AnalysisDocumentV1;
  rawRows: Record<string, unknown>[];
}): Extract<AnalysisStreamEvent, { t: "final" }> {
  const total = params.rawRows.length;
  const cap = ANALYSIS_STREAM_TABLE_ROW_CAP;
  if (total <= cap) {
    return {
      t: "final",
      document: params.document,
      tableRows: params.rawRows,
      tableRowTotalCount: total,
      tableRowsTruncated: false,
    };
  }
  return {
    t: "final",
    document: params.document,
    tableRows: params.rawRows.slice(0, cap),
    tableRowTotalCount: total,
    tableRowsTruncated: true,
  };
}
