/**
 * Formatter Agent — generates a display formatter plan from query results,
 * then applies it to produce final markdown and table rows.
 *
 * StreamObject with fallback chain.
 */

import { streamObject, type LanguageModelUsage } from "ai";
import { deepseek } from "@ai-sdk/deepseek";

import { getDefaultAiProvider } from "@/lib/ai";
import {
  parseFormatterPlan,
  formatterPlanV1Schema,
  type FormatterPlanV1,
} from "@/lib/insights-query/schemas";
import {
  applyFormatterPlan,
  formatOutputMarkdown,
} from "@/lib/reports/formatter-engine";

import { FORMATTER_MAX_TOKENS } from "./constants";
import type { ReportStreamEvent } from "./events";
import type { ReportGenerationPlan } from "@/lib/reports/report-schemas";
import {
  getFormatterSystemPrompt,
  buildFormatterUserPrompt,
} from "./prompts";

const LOG_PREFIX = "[agent/formatter]";

export interface RunFormatterResult {
  markdown: string;
  preambleMarkdown: string;
  tableRows: Record<string, unknown>[];
  formatterPlan: FormatterPlanV1;
}

export interface RunFormatterOptions {
  onLlmUsage?: (usage: LanguageModelUsage) => void;
}

export async function runFormatterAgent(params: {
  intentSummary: string;
  userQuery: string;
  columns: { key: string; sampleTypes: string }[];
  sampleRows: Record<string, unknown>[];
  generationPlan?: ReportGenerationPlan;
  write: (event: ReportStreamEvent) => Promise<void>;
  opts?: RunFormatterOptions;
}): Promise<RunFormatterResult> {
  const {
    intentSummary,
    userQuery,
    columns,
    sampleRows,
    generationPlan,
    write,
    opts,
  } = params;

  const system = getFormatterSystemPrompt();
  const prompt = buildFormatterUserPrompt({
    intentSummary,
    userQuery,
    columns,
    sampleRowsJson: JSON.stringify(sampleRows.slice(0, 15), null, 2),
    generationPlan,
  });

  // ─── Try streaming first ─────────────────────────────────────────────
  let formatterPlan: FormatterPlanV1 | null = null;

  try {
    let finishObject: FormatterPlanV1 | undefined;
    let finishUsage: LanguageModelUsage | undefined;

    const streamResult = streamObject({
      model: deepseek("deepseek-chat"),
      system,
      prompt,
      schema: formatterPlanV1Schema,
      maxOutputTokens: FORMATTER_MAX_TOKENS,
      onFinish: ({ object, usage }) => {
        finishObject = object as FormatterPlanV1 | undefined;
        finishUsage = usage;
      },
    });

    for await (const partial of streamResult.partialObjectStream) {
      await write({ t: "formatter_partial", partial });
    }

    if (finishUsage) opts?.onLlmUsage?.(finishUsage);

    const output = finishObject;
    if (!output) {
      throw new Error("Formatter produced no output after streaming.");
    }

    formatterPlan = parseFormatterPlan(output);
    if (!formatterPlan) {
      throw new Error("Formatter produced an invalid plan.");
    }
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Streaming failed, falling back to generateObject:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // ─── Fallback: generateObject ────────────────────────────────────────
  if (!formatterPlan) {
    try {
      const provider = getDefaultAiProvider();
      const { object, usage } = await provider.generateObject<FormatterPlanV1>({
        system,
        prompt,
        schema: formatterPlanV1Schema,
        maxOutputTokens: FORMATTER_MAX_TOKENS,
      });
      opts?.onLlmUsage?.(usage);
      formatterPlan = parseFormatterPlan(object);
      if (!formatterPlan) {
        throw new Error("Formatter generateObject returned invalid plan.");
      }
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Fallback attempt failed:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ─── Last resort: minimal plan (pass-through) ────────────────────────
  if (!formatterPlan) {
    console.warn(
      `${LOG_PREFIX} All LLM attempts failed, using pass-through plan.`,
    );
    formatterPlan = {
      version: 1,
      outputStyle: "markdown_table",
      ops: [{ op: "limit", n: 200 }],
    };
  }

  await write({
    t: "formatter_complete",
    outputStyle: formatterPlan.outputStyle,
    rowCount: sampleRows.length,
  });

  // ─── Apply the formatter plan ────────────────────────────────────────
  const formattedRows = applyFormatterPlan(sampleRows, formatterPlan);
  const md = formatOutputMarkdown(
    formattedRows,
    formatterPlan.outputStyle,
    { segmentBy: formatterPlan.segmentMarkdownTablesByColumn },
  );

  return {
    markdown: md,
    preambleMarkdown: "",
    tableRows: formattedRows,
    formatterPlan,
  };
}
