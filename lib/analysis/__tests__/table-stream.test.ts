import { describe, expect, it } from "vitest";

import { ANALYSIS_STREAM_TABLE_ROW_CAP } from "../constants";
import { buildFinalAnalysisStreamEvent } from "../table-stream";
import type { AnalysisDocumentV1 } from "../analysis-schemas";

const doc: AnalysisDocumentV1 = { version: 1, blocks: [] };

describe("buildFinalAnalysisStreamEvent", () => {
  it("returns all rows when under cap", () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({ n: i }));
    const ev = buildFinalAnalysisStreamEvent({ document: doc, rawRows: raw });
    expect(ev.tableRows).toHaveLength(10);
    expect(ev.tableRowTotalCount).toBe(10);
    expect(ev.tableRowsTruncated).toBe(false);
  });

  it("truncates rows and sets flags over cap", () => {
    const raw = Array.from({ length: ANALYSIS_STREAM_TABLE_ROW_CAP + 42 }, (_, i) => ({
      n: i,
    }));
    const ev = buildFinalAnalysisStreamEvent({ document: doc, rawRows: raw });
    expect(ev.tableRows).toHaveLength(ANALYSIS_STREAM_TABLE_ROW_CAP);
    expect(ev.tableRowTotalCount).toBe(ANALYSIS_STREAM_TABLE_ROW_CAP + 42);
    expect(ev.tableRowsTruncated).toBe(true);
  });

  it("does not truncate when length equals cap", () => {
    const raw = Array.from({ length: ANALYSIS_STREAM_TABLE_ROW_CAP }, (_, i) => ({
      n: i,
    }));
    const ev = buildFinalAnalysisStreamEvent({ document: doc, rawRows: raw });
    expect(ev.tableRows).toHaveLength(ANALYSIS_STREAM_TABLE_ROW_CAP);
    expect(ev.tableRowsTruncated).toBe(false);
  });
});
