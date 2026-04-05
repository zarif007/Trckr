/**
 * Query Agent — generates a QueryPlanV1 AST from the Architect's ReportIntent.
 *
 * StreamObject with fallback chain. If all LLM attempts fail, falls back to a
 * deterministic minimal plan.
 */

import { streamObject, type LanguageModelUsage } from "ai";
import { deepseek } from "@ai-sdk/deepseek";

import { getDefaultAiProvider } from "@/lib/ai";
import {
  parseQueryPlan,
  queryPlanV1Schema,
  type QueryPlanV1,
} from "@/lib/insights-query/schemas";

import { QUERY_MAX_TOKENS } from "./constants";
import type { ReportStreamEvent } from "./events";
import type { ReportIntent } from "@/lib/reports/report-schemas";
import {
  getQuerySystemPrompt,
  buildQueryUserPrompt,
  buildQueryMinimalPrompt,
} from "./prompts";

const LOG_PREFIX = "[agent/query]";

export interface RunQueryOptions {
  onLlmUsage?: (usage: LanguageModelUsage) => void;
}

export async function runQueryAgent(params: {
  intent: ReportIntent;
  catalogText: string;
  userQuery: string;
  trackerInstance: "SINGLE" | "MULTI";
  versionControl: boolean;
  write: (event: ReportStreamEvent) => Promise<void>;
  opts?: RunQueryOptions;
}): Promise<QueryPlanV1> {
  const { intent, catalogText, userQuery, trackerInstance, versionControl, write, opts } =
    params;

  const system = getQuerySystemPrompt();
  const prompt = buildQueryUserPrompt({
    intent: intent as unknown as Record<string, unknown>,
    catalogText,
    userQuery,
    trackerInstance,
    versionControl,
  });

  // ─── Try streaming first ─────────────────────────────────────────────────
  try {
    let finishUsage: LanguageModelUsage | undefined;
    let finishObject: QueryPlanV1 | undefined;
    let lastPartial: Partial<QueryPlanV1> | undefined;

    const streamResult = streamObject({
      model: deepseek("deepseek-chat"),
      system,
      prompt,
      schema: queryPlanV1Schema,
      maxOutputTokens: QUERY_MAX_TOKENS,
      onFinish: ({ object, usage }) => {
        finishObject = object as QueryPlanV1 | undefined;
        finishUsage = usage;
      },
    });

    for await (const partial of streamResult.partialObjectStream) {
      lastPartial = partial as Partial<QueryPlanV1>;
      await write({ t: "query_partial", partial });
    }

    if (finishUsage) opts?.onLlmUsage?.(finishUsage);

    const output = finishObject ?? (lastPartial as QueryPlanV1 | undefined);
    const validated = output ? parseQueryPlan(output) : null;
    if (!validated) {
      throw new Error("Query agent produced no valid QueryPlanV1 after streaming.");
    }

    await write({ t: "query_complete", queryPlan: validated });
    return validated;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Streaming failed, falling back to generateObject:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // ─── Fallback: generateObject ────────────────────────────────────────────
  const provider = getDefaultAiProvider();

  try {
    const { object, usage } = await provider.generateObject<QueryPlanV1>({
      system,
      prompt,
      schema: queryPlanV1Schema,
      maxOutputTokens: QUERY_MAX_TOKENS,
    });
    opts?.onLlmUsage?.(usage);
    const validated = parseQueryPlan(object);
    if (!validated) {
      throw new Error("Query agent generateObject returned invalid plan.");
    }
    await write({ t: "query_complete", queryPlan: validated });
    return validated;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Fallback attempt failed, retrying with minimal prompt:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // ─── Last resort: minimal prompt ─────────────────────────────────────────
  try {
    const minimalPrompt = buildQueryMinimalPrompt(userQuery);
    const { object, usage } = await provider.generateObject<QueryPlanV1>({
      system: getQuerySystemPrompt(),
      prompt: minimalPrompt,
      schema: queryPlanV1Schema,
      maxOutputTokens: QUERY_MAX_TOKENS,
    });
    opts?.onLlmUsage?.(usage);
    const validated = parseQueryPlan(object);
    if (validated) {
      await write({ t: "query_complete", queryPlan: validated });
      return validated;
    }
  } catch (err) {
    console.warn(
      `${LOG_PREFIX} Minimal prompt attempt failed:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ─── Deterministic fallback ──────────────────────────────────────────────
  console.warn(`${LOG_PREFIX} All LLM attempts failed, using deterministic fallback.`);
  const plan = buildMinimalQueryPlanV1(intent);
  await write({ t: "query_complete", queryPlan: plan });
  return plan;
}

// ─── Deterministic fallback plan ───

function buildMinimalQueryPlanV1(intent: ReportIntent): QueryPlanV1 {
  const gridIds = intent.gridIds && intent.gridIds.length > 0 ? intent.gridIds : [];
  const maxRows = 500;

  const rowTimeFilter =
    intent.timeRange.kind !== "none"
      ? {
          field: (intent.timeRange.applyToRow ?? "createdAt") as "createdAt" | "updatedAt",
          preset:
            (intent.timeRange.preset as
              | "last_7_days"
              | "last_30_days"
              | "last_calendar_month"
              | "all"
              | undefined) ?? "last_30_days",
          from: intent.timeRange.fromIso ?? undefined,
          to: intent.timeRange.toIso ?? undefined,
        }
      : undefined;

  const filters = (intent.filters || []).map((f) => {
    const safeValue =
      f.value && typeof f.value === "object" && !Array.isArray(f.value)
        ? Object.fromEntries(
            Object.entries(f.value).filter(
              ([, v]) =>
                typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean" ||
                v === null,
            ),
          )
        : f.value;
    return {
      path: f.fieldPath,
      op: f.op,
      value: safeValue,
    };
  });

  const metrics = intent.metrics
    .filter((m) => m.aggregation !== "none")
    .map((m, i) => ({
      name: m.label || `metric_${i}`,
      op: m.aggregation as "sum" | "count" | "avg" | "min" | "max",
      path: m.fieldPath,
    }));

  const plan: QueryPlanV1 = {
    version: 1,
    load: {
      maxTrackerDataRows: maxRows,
      ...(rowTimeFilter ? { rowTimeFilter } : {}),
    },
    flatten: { gridIds },
    filter: filters as QueryPlanV1["filter"],
    ...(metrics.length > 0
      ? {
          aggregate: {
            groupBy: intent.groupByFieldPaths || [],
            metrics,
          },
        }
      : {}),
    sort: [{ path: "__createdAt", direction: "desc" as const }],
    limit: maxRows,
  };

  return plan;
}

