/**
 * Data Agent — deterministic data loader and query executor.
 *
 * No LLM calls. Loads tracker rows, executes the query plan, returns
 * enriched rows with a schema summary.
 */

import { loadTrackerDataForQueryPlan } from "@/lib/insights-query/load-tracker-rows";
import {
  executeQueryPlan,
  resultSchemaFromRows,
} from "@/lib/insights-query/query-executor";

import type { QueryPlanV1 } from "@/lib/insights-query/schemas";
import type { ReportStreamEvent } from "./events";

export interface RunDataResult {
  rows: Record<string, unknown>[];
  sampleRows: Record<string, unknown>[];
  columns: { key: string; sampleTypes: string }[];
}

export async function runDataAgent(params: {
  queryPlan: QueryPlanV1;
  trackerSchemaId: string;
  trackerInstance: "SINGLE" | "MULTI";
  write: (event: ReportStreamEvent) => Promise<void>;
}): Promise<RunDataResult> {
  const { queryPlan, trackerSchemaId, trackerInstance, write } = params;

  const trackerRows = await loadTrackerDataForQueryPlan({
    trackerSchemaId,
    plan: queryPlan,
    trackerInstance,
  });

  const rawResult = executeQueryPlan(trackerRows, queryPlan);

  const schema = resultSchemaFromRows(rawResult, 20);
  const columns = schema.columns.map((c) => ({
    key: c.key,
    sampleTypes: Array.isArray(c.sampleTypes) ? c.sampleTypes.join(", ") : String(c.sampleTypes),
  }));
  const sampleRows = schema.sample;

  await write({
    t: "data_preview",
    rowCount: rawResult.length,
    columns: columns.map((c) => c.key),
  });

  await write({
    t: "data_complete",
    rowCount: rawResult.length,
    columns: columns.map((c) => c.key),
    sampleRows: sampleRows.slice(0, 5),
  });

  return { rows: rawResult, sampleRows, columns };
}
