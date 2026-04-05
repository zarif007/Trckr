/**
 * Architect Agent — maps user natural-language requests into a structured ReportIntent.
 *
 * Follows the same pattern as the builder-tracker manager-agent:
 * streamObject → fallback generateObject → fallback minimal prompt.
 */

import { streamObject, type LanguageModelUsage } from "ai";
import { deepseek } from "@ai-sdk/deepseek";

import { getDefaultAiProvider } from "@/lib/ai";
import {
  reportIntentSchema,
  type ReportIntent,
  defaultReportGenerationPlan,
} from "@/lib/reports/report-schemas";

import { ARCHITECT_MAX_TOKENS } from "./constants";
import type { ReportStreamEvent } from "./events";
import {
  getArchitectSystemPrompt,
  buildArchitectUserPrompt,
  buildArchitectMinimalPrompt,
} from "./prompts";

const LOG_PREFIX = "[agent/architect]";

export interface RunArchitectOptions {
  onLlmUsage?: (usage: LanguageModelUsage) => void;
}

export async function runArchitect(params: {
  userQuery: string;
  catalogText: string;
  trackerInstance: "SINGLE" | "MULTI";
  versionControl: boolean;
  write: (event: ReportStreamEvent) => Promise<void>;
  opts?: RunArchitectOptions;
}): Promise<ReportIntent> {
  const { userQuery, catalogText, trackerInstance, versionControl, write, opts } =
    params;

  const system = getArchitectSystemPrompt({ trackerInstance, versionControl });
  const prompt = buildArchitectUserPrompt({
    userQuery,
    catalogText,
    trackerInstance,
    versionControl,
  });

  // ─── Try streaming first ─────────────────────────────────────────────────
  try {
    let finishObject: ReportIntent | undefined;
    let finishUsage: LanguageModelUsage | undefined;

    const streamResult = streamObject({
      model: deepseek("deepseek-chat"),
      system,
      prompt,
      schema: reportIntentSchema,
      maxOutputTokens: ARCHITECT_MAX_TOKENS,
      onFinish: ({ object, usage }) => {
        finishObject = object as ReportIntent | undefined;
        finishUsage = usage;
      },
    });

    for await (const partial of streamResult.partialObjectStream) {
      await write({ t: "architect_partial", partial });
    }

    if (finishUsage) opts?.onLlmUsage?.(finishUsage);

    const output = finishObject;
    if (!output) throw new Error("Architect produced no output after streaming.");

    await write({ t: "architect_complete", intent: output });
    return output;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Streaming failed, falling back to generateObject:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // ─── Fallback: non-streaming generateObject ──────────────────────────────
  const provider = getDefaultAiProvider();

  try {
    const { object, usage } = await provider.generateObject<ReportIntent>({
      system,
      prompt,
      schema: reportIntentSchema,
      maxOutputTokens: ARCHITECT_MAX_TOKENS,
    });
    opts?.onLlmUsage?.(usage);
    await write({ t: "architect_complete", intent: object });
    return object;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Fallback attempt failed, retrying with minimal prompt:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  // ─── Last resort: minimal prompt ─────────────────────────────────────────
  const minimalPrompt = buildArchitectMinimalPrompt(userQuery);
  const { object, usage } = await provider.generateObject<ReportIntent>({
    system,
    prompt: minimalPrompt,
    schema: reportIntentSchema,
    maxOutputTokens: ARCHITECT_MAX_TOKENS,
  });
  opts?.onLlmUsage?.(usage);
  await write({ t: "architect_complete", intent: object });
  return {
    ...object,
    generationPlan: object.generationPlan ?? defaultReportGenerationPlan(),
  };
}
