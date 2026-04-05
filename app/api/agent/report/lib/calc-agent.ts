/**
 * Calc Agent — determines which derived columns are needed, then generates
 * ExprNode ASTs for each one.
 *
 * Two sub-stages:
 * 1. Calc intent: which derived columns to add (generateObject)
 * 2. Per-column expression: ExprNode AST generation (generateReportExprAst with retry)
 */

import type { LanguageModelUsage } from "ai";
import { z } from "zod";

import { getDefaultAiProvider } from "@/lib/ai";
import { generateReportExprAst } from "@/lib/reports/report-generate-expr";

import { CALC_MAX_TOKENS, CALC_EXPR_MAX_TOKENS } from "./constants";
import type { ReportStreamEvent } from "./events";
import type { ReportGenerationPlan } from "@/lib/reports/report-schemas";
import {
  getCalcSystemPrompt,
  buildCalcUserPrompt,
  getCalcExprSystemPrompt,
  buildCalcExprUserPrompt,
} from "./prompts";

export interface CalcColumnSpec {
  name: string;
  instruction: string;
}

export interface ReportCalcPlan {
  version: 1;
  columns: { name: string; expr: unknown }[];
}

export interface RunCalcOptions {
  onLlmUsage?: (usage: LanguageModelUsage) => void;
}

export async function runCalcAgent(params: {
  intentSummary: string;
  userQuery: string;
  columns: string[];
  sampleRows: Record<string, unknown>[];
  generationPlan?: ReportGenerationPlan;
  trackerSchema: unknown;
  primaryGridId: string;
  write: (event: ReportStreamEvent) => Promise<void>;
  opts?: RunCalcOptions;
}): Promise<ReportCalcPlan> {
  const {
    intentSummary,
    userQuery,
    columns: columnKeys,
    sampleRows,
    generationPlan,
    write,
    opts,
  } = params;

  const provider = getDefaultAiProvider();
  const sampleJson = JSON.stringify(sampleRows.slice(0, 15), null, 2);

  // ─── Stage 1: Calc intent — which columns to add ─────────────────────
  const { object: calcIntent, usage: intentUsage } =
    await provider.generateObject<CalcIntentPayload>({
      system: getCalcSystemPrompt(),
      prompt: buildCalcUserPrompt({
        intentSummary,
        userQuery,
        columnKeys,
        sampleRowsJson: sampleJson,
        generationPlan,
      }),
      schema: calcIntentSchema,
      maxOutputTokens: CALC_MAX_TOKENS,
    });
  opts?.onLlmUsage?.(intentUsage);

  if (calcIntent.columns.length === 0) {
    const emptyPlan: ReportCalcPlan = { version: 1, columns: [] };
    await write({ t: "calc_complete", calcPlan: emptyPlan, columnsAdded: 0 });
    return emptyPlan;
  }

  await write({ t: "calc_partial", partial: calcIntent.columns });

  // ─── Stage 2: Generate expression AST per column ─────────────────────
  const built: { name: string; expr: unknown }[] = [];

  for (const spec of calcIntent.columns) {
    await write({
      t: "phase_delta",
      phase: "calc",
      text: `Generating expression for column \`${spec.name}\`…`,
    });

    const expr = await generateCalcExpr({
      columnName: spec.name,
      instruction: spec.instruction,
      availableColumns: columnKeys,
      trackerSchema: params.trackerSchema,
      primaryGridId: params.primaryGridId,
      write,
    });

    if (expr) {
      built.push({ name: spec.name, expr });
    }
  }

  const calcPlan: ReportCalcPlan = { version: 1, columns: built };
  await write({
    t: "calc_complete",
    calcPlan,
    columnsAdded: built.length,
  });

  return calcPlan;
}

async function generateCalcExpr(params: {
  columnName: string;
  instruction: string;
  availableColumns: string[];
  trackerSchema: unknown;
  primaryGridId: string;
  write: (event: ReportStreamEvent) => Promise<void>;
}): Promise<unknown | null> {
  const { columnName, instruction, availableColumns } = params;
  const provider = getDefaultAiProvider();

  // ─── Attempt 1: normal prompt ────────────────────────────────────────
  try {
    const result = await generateReportExprAst({
      prompt: `${columnName}: ${instruction}`,
      trackerSchema: params.trackerSchema as Record<string, unknown>,
      primaryGridId: params.primaryGridId,
      fieldId: `report.calc.${columnName}`,
    });
    return result.expr;
  } catch {
    // fall through to retry
  }

  // ─── Attempt 2: strict prompt via generateObject ─────────────────────
  try {
    const strictPrompt = [
      "STRICT MODE: Use only these operators:",
      "const, field, add, mul, sub, div, mod, pow, eq, neq, gt, gte, lt, lte, and, or, not, if, regex, sum, accumulate, count, min, max, concat, clamp, slice, abs, round, floor, ceil, length, trim, toUpper, toLower, includes.",
      "Do not invent operators.",
      buildCalcExprUserPrompt({
        columnName,
        instruction,
        availableColumns,
      }),
    ].join("\n");

    const { object } = await provider.generateObject<CalcExprPayload>({
      system: getCalcExprSystemPrompt(),
      prompt: strictPrompt,
      schema: calcExprPayloadSchema,
      maxOutputTokens: CALC_EXPR_MAX_TOKENS,
    });
    return object.expr;
  } catch {
    console.warn(
      `[agent/calc] Failed to generate expression for "${columnName}".`,
    );
    return null;
  }
}

// ─── Schemas (defined inline to avoid circular deps) ─────────────────────

const calcIntentSchema = z.object({
  columns: z.array(
    z.object({
      name: z.string(),
      instruction: z.string(),
    }),
  ),
});

type CalcIntentPayload = z.infer<typeof calcIntentSchema>;

interface CalcExprPayload {
  expr: unknown;
}

const calcExprPayloadSchema = z.object({
  expr: z.unknown(),
});
