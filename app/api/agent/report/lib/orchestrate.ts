/**
 * Orchestrates the report generation pipeline:
 * Architect → Query → Data → Calc → Formatter.
 *
 * Each phase writes phase events to the NDJSON stream controller.
 * On success, saves definition artifacts to the database.
 */

import "server-only";

import type { LanguageModelUsage } from "ai";

import { hasDeepSeekApiKey } from "@/lib/ai";
import { withTracedRun } from "@/lib/insights/with-traced-run";
import {
  buildFieldCatalog,
  formatCatalogForPrompt,
} from "@/lib/insights-query/field-catalog";
import { fingerprintFromCatalog } from "@/lib/insights-query/fingerprint";
import {
  parseQueryPlan,
  parseFormatterPlan,
  type QueryPlanV1,
} from "@/lib/insights-query/schemas";
import {
  executeQueryPlan,
  resultSchemaFromRows,
} from "@/lib/insights-query/query-executor";
import { loadTrackerDataForQueryPlan } from "@/lib/insights-query/load-tracker-rows";
import {
  applyCalcPlanToRows,
  emptyCalcPlan,
  parseCalcPlan,
} from "@/lib/reports/calc-plan";
import {
  applyFormatterPlan,
  formatOutputMarkdown,
} from "@/lib/reports/formatter-engine";
import {
  saveDefinitionArtifacts,
  updateDefinitionPrompt,
  markDefinitionError,
  getReportForUser,
  createReportRun,
  finishReportRun,
  appendReportRunEvent,
} from "@/lib/reports/report-repository";
import type { ReportStreamEvent as ExistingReportStreamEvent } from "@/lib/reports/stream-events";

/**
 * Adapter: casts our extended ReportStreamEvent to the existing type so
 * appendReportRunEvent (typed against the existing ReportStreamEvent) accepts it.
 * All non-overlapping event types are safely serialized since they share phase/message/text structures.
 */
const appendEvent = (
  runId: string,
  seq: number,
  event: ReportStreamEvent,
) => appendReportRunEvent(runId, seq, event as ExistingReportStreamEvent);

import { runArchitect } from "./architect-agent";
import { runQueryAgent } from "./query-agent";
import { runDataAgent } from "./data-agent";
import { runCalcAgent, type ReportCalcPlan } from "./calc-agent";
import { runFormatterAgent } from "./formatter-agent";
import type { ReportStreamEvent } from "./events";
import { encodeNdjsonLine } from "./events";

export type LoadedReport = NonNullable<
  Awaited<ReturnType<typeof getReportForUser>>
>;

export interface OrchestrateOptions {
  onLlmUsage?: (usage: LanguageModelUsage) => void;
}

export async function orchestrateReport(params: {
  userId: string;
  reportId: string;
  userPrompt: string;
  regenerate: boolean;
  replayQueryPlan?: QueryPlanV1;
  writeNdjsonLine: (line: string) => Promise<void> | void;
  opts?: OrchestrateOptions;
}): Promise<void> {
  const report = await getReportForUser(params.reportId, params.userId);
  if (!report) {
    throw new Error("Report not found.");
  }

  const prompt =
    params.userPrompt.trim() || report.definition?.userPrompt?.trim() || "";
  const replayable = isReplayable(report) && !params.regenerate;

  if (!prompt && !replayable) {
    throw new Error("Prompt is required for the first generation.");
  }

  try {
    if (replayable) {
      await executeReportReplay({
        report,
        writeNdjsonLine: params.writeNdjsonLine,
        queryPlan: params.replayQueryPlan,
      });
    } else {
      if (!prompt) {
        throw new Error("Prompt is required.");
      }
      await executeReportFullGeneration({
        userId: params.userId,
        report,
        userPrompt: prompt,
        writeNdjsonLine: params.writeNdjsonLine,
        opts: params.opts,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report generation failed";
    if (!replayable) {
      await markDefinitionError(params.reportId, message);
    }
    throw e;
  }
}

export function isReplayable(report: LoadedReport): boolean {
  const def = report.definition;
  if (
    !def ||
    def.status !== "ready" ||
    !def.queryPlan ||
    !def.formatterPlan ||
    !def.schemaFingerprint
  ) {
    return false;
  }
  if (def.calcPlan != null && parseCalcPlan(def.calcPlan) == null) {
    return false;
  }
  const catalog = buildFieldCatalog(report.trackerSchema.schema);
  const fp = fingerprintFromCatalog(catalog);
  if (fp !== def.schemaFingerprint) return false;
  return !!(
    parseQueryPlan(def.queryPlan) && parseFormatterPlan(def.formatterPlan)
  );
}

// ─── Replay (deterministic, no LLM) ────────────────────────────────────────

async function executeReportReplay(params: {
  report: LoadedReport;
  writeNdjsonLine: (line: string) => Promise<void> | void;
  queryPlan?: QueryPlanV1;
}): Promise<void> {
  const { report, writeNdjsonLine, queryPlan: queryPlanParam } = params;
  const def = report.definition;
  if (!def) throw new Error("Missing definition");

  const plan = queryPlanParam ?? parseQueryPlan(def.queryPlan);
  const fmt = parseFormatterPlan(def.formatterPlan);
  if (!plan || !fmt) throw new Error("Invalid saved recipe");

  const trigger = def.status === "draft" ? "initial" : "refresh";

  await withTracedRun<ReportStreamEvent>({
    writeNdjsonLine,
    encodeLine: encodeNdjsonLine,
    createRun: () => createReportRun(report.id, trigger),
    appendEvent,
    finishRun: finishReportRun,
    buildErrorEvent: (message) => ({ t: "error", message }),
    fn: async (forward) => {
      await forward({
        t: "phase_start",
        phase: "replay",
        label: "Running saved recipe (no AI)",
      });
      await forward({
        t: "phase_delta",
        phase: "replay",
        text: "Loading tracker rows and executing query plan…",
      });

      const trackerRows = await loadTrackerDataForQueryPlan({
        trackerSchemaId: report.trackerSchemaId,
        plan,
        trackerInstance: report.trackerSchema.instance as "SINGLE" | "MULTI",
      });
      const rawResult = executeQueryPlan(trackerRows, plan);
      const effectiveCalc =
        def.calcPlan == null ? emptyCalcPlan() : parseCalcPlan(def.calcPlan);
      if (def.calcPlan != null && effectiveCalc == null) {
        throw new Error("Invalid saved calculation plan.");
      }
      const afterCalc = applyCalcPlanToRows(rawResult, effectiveCalc);
      const formattedRows = applyFormatterPlan(afterCalc, fmt);
      const schema = resultSchemaFromRows(afterCalc, 20);

      await forward({
        t: "data_preview",
        rowCount: formattedRows.length,
        columns: schema.columns.map((c: { key: string }) => c.key),
      });

      await forward({
        t: "phase_delta",
        phase: "replay",
        text: "Applying saved calculations and formatter…",
      });

      const md = formatOutputMarkdown(
        formattedRows,
        fmt.outputStyle ?? "markdown_table",
        { segmentBy: fmt.segmentMarkdownTablesByColumn },
      );

      await forward({ t: "phase_end", phase: "replay", summary: "Done." });
      await forward({
        t: "final",
        markdown: md,
        tableRows: formattedRows,
      });
    },
  });
}

// ─── Full Generation ───────────────────────────────────────────────────────

async function executeReportFullGeneration(params: {
  userId: string;
  report: LoadedReport;
  userPrompt: string;
  writeNdjsonLine: (line: string) => Promise<void> | void;
  opts?: OrchestrateOptions;
}): Promise<void> {
  const { report, userPrompt, writeNdjsonLine, opts } = params;

  if (!hasDeepSeekApiKey()) {
    throw new Error("DEEPSEEK_API_KEY is not configured.");
  }

  const catalog = buildFieldCatalog(report.trackerSchema.schema);
  const catalogText = formatCatalogForPrompt(catalog);
  const fp = fingerprintFromCatalog(catalog);
  const trackerInstance =
    report.trackerSchema.instance as "SINGLE" | "MULTI";
  const versionControl = report.trackerSchema.versionControl;
  const def = report.definition;
  const trigger = def?.status === "draft" ? "initial" : "refresh";

  await withTracedRun<ReportStreamEvent>({
    writeNdjsonLine,
    encodeLine: encodeNdjsonLine,
    createRun: () => createReportRun(report.id, trigger),
    appendEvent,
    finishRun: finishReportRun,
    buildErrorEvent: (message) => ({ t: "error", message }),
    fn: async (forward) => {
      await updateDefinitionPrompt(report.id, userPrompt);

      // ─── Phase 1: Architect ──────────────────────────────────────────
      await forward({
        t: "phase_start",
        phase: "architect",
        label: "Architect analyzing intent",
      });
      await forward({
        t: "phase_delta",
        phase: "architect",
        text: "Extracting fields, filters, grouping, sorting, and load rules…",
      });

      const intent = await runArchitect({
        userQuery: userPrompt,
        catalogText,
        trackerInstance,
        versionControl,
        write: forward,
        opts: opts && { onLlmUsage: opts.onLlmUsage },
      });

      await forward({
        t: "artifact",
        phase: "architect",
        kind: "intent",
        data: intent,
      });
      await forward({
        t: "phase_end",
        phase: "architect",
        summary: intent.narrative,
      });

      // ─── Phase 2: Query ──────────────────────────────────────────────
      await forward({
        t: "phase_start",
        phase: "query",
        label: "Query compiling AST",
      });
      await forward({
        t: "phase_delta",
        phase: "query",
        text: "Mapping to safe query AST…",
      });

      const queryPlan = await runQueryAgent({
        intent,
        catalogText,
        userQuery: userPrompt,
        trackerInstance,
        versionControl,
        write: forward,
        opts: opts && { onLlmUsage: opts.onLlmUsage },
      });

      await forward({
        t: "artifact",
        phase: "query",
        kind: "query_plan",
        data: queryPlan,
      });
      await forward({
        t: "phase_end",
        phase: "query",
        summary: "Query plan validated.",
      });

      // ─── Phase 3: Data ───────────────────────────────────────────────
      await forward({
        t: "phase_start",
        phase: "data",
        label: "Loading rows",
      });
      await forward({
        t: "phase_delta",
        phase: "data",
        text: "Fetching tracker data and applying filters…",
      });

      const dataResult = await runDataAgent({
        queryPlan,
        trackerSchemaId: report.trackerSchemaId,
        trackerInstance,
        write: forward,
      });

      await forward({
        t: "phase_end",
        phase: "data",
        summary: `${dataResult.rows.length} row(s) loaded.`,
      });

      // ─── Phase 4: Calc ───────────────────────────────────────────────
      const primaryGridId =
        intent.gridIds[0] ||
        (dataResult.rows.find(
          (r) => typeof r.__gridId === "string",
        )?.__gridId as string) ||
        catalog.gridIds[0] ||
        "";

      await forward({
        t: "phase_start",
        phase: "calc",
        label: "Deriving columns",
      });
      await forward({
        t: "phase_delta",
        phase: "calc",
        text: "Checking whether extra per-row calculations are needed…",
      });

      let calcPlan: ReportCalcPlan = { version: 1, columns: [] };
      if (primaryGridId) {
        calcPlan = await runCalcAgent({
          intentSummary: intent.narrative,
          userQuery: userPrompt,
          columns: dataResult.columns.map((c) => c.key),
          sampleRows: dataResult.sampleRows,
          generationPlan: intent.generationPlan,
          trackerSchema: report.trackerSchema.schema,
          primaryGridId,
          write: forward,
          opts: opts && { onLlmUsage: opts.onLlmUsage },
        });
      } else {
        await forward({
          t: "phase_delta",
          phase: "calc",
          text: "Could not determine a primary grid; skipping expression generation.",
        });
      }

      const calcPlanForEngine = {
        version: 1 as const,
        columns: calcPlan.columns,
      };
      const enrichedRows = applyCalcPlanToRows(
        dataResult.rows,
        calcPlanForEngine,
      );
      const enrichedSchema = resultSchemaFromRows(enrichedRows, 20);

      await forward({
        t: "artifact",
        phase: "calc",
        kind: "calc_plan",
        data: calcPlan,
      });
      await forward({
        t: "phase_end",
        phase: "calc",
        summary:
          calcPlan.columns.length > 0
            ? `${calcPlan.columns.length} derived column(s).`
            : "No derived columns.",
      });

      await forward({
        t: "data_preview",
        rowCount: enrichedRows.length,
        columns: enrichedSchema.columns.map(
          (c: { key: string }) => c.key,
        ),
      });

      // ─── Phase 4b: Formatter ──────────────────────────────────────────
      await forward({
        t: "phase_start",
        phase: "formatter",
        label: "Formatting output",
      });
      await forward({
        t: "phase_delta",
        phase: "formatter",
        text: "Building display formatting plan…",
      });

      const formatterResult = await runFormatterAgent({
        intentSummary: intent.narrative,
        userQuery: userPrompt,
        columns: enrichedSchema.columns,
        sampleRows: enrichedRows,
        generationPlan: intent.generationPlan,
        write: forward,
        opts: opts && { onLlmUsage: opts.onLlmUsage },
      });

      await forward({
        t: "phase_end",
        phase: "formatter",
        summary: `${formatterResult.tableRows.length} row(s) for display.`,
      });

      // ─── Final ───────────────────────────────────────────────────────
      await forward({
        t: "final",
        markdown: formatterResult.markdown,
        preambleMarkdown: formatterResult.preambleMarkdown,
        tableRows: formatterResult.tableRows,
      });

      // ─── Save definition artifacts ───────────────────────────────────
      await saveDefinitionArtifacts({
        reportId: report.id,
        userPrompt,
        intent,
        queryPlan,
        calcPlan,
        formatterPlan: formatterResult.formatterPlan,
        schemaFingerprint: fp,
        status: "ready",
        lastError: null,
      });
    },
  });
}
