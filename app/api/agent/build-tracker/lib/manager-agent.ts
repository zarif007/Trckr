/**
 * Manager Agent — plans what to build before handing off to the Builder.
 *
 * Streams its output (thinking → prd → builderTodo) via `manager_partial` events so the
 * frontend can render the plan progressively. Writes `manager_complete` once the full
 * ManagerSchema is available, then returns it for the Builder to consume.
 *
 * Falls back to non-streaming `generateObject` if streaming fails.
 */

import { streamObject } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import type { LanguageModelUsage } from "ai";

import type { RequestLogContext } from "@/lib/api";
import { getDefaultAiProvider, logAiError, logAiStage } from "@/lib/ai";
import { managerSchema, type ManagerSchema } from "@/lib/schemas/multi-agent";
import type { AgentStreamEvent } from "@/lib/agent/events";
import type { PromptInputs } from "./prompts";
import { getManagerSystemPrompt, buildManagerUserPrompt } from "./prompts";
import { MANAGER_MAX_TOKENS } from "./constants";

const LOG_PREFIX = "[agent/manager]";

export interface RunManagerAgentOptions {
  logContext?: RequestLogContext;
  onLlmUsage?: (usage: LanguageModelUsage) => void;
}

/**
 * Run the manager agent with streaming.
 * Writes `manager_partial` events for each chunk, then `manager_complete` on finish.
 * Falls back to non-streaming generateObject if the stream fails, then retries with a
 * minimal prompt as a last resort.
 */
export async function runManagerAgent(
  inputs: PromptInputs,
  write: (event: AgentStreamEvent) => void,
  opts: RunManagerAgentOptions = {},
): Promise<ManagerSchema> {
  const system = getManagerSystemPrompt();
  const prompt = buildManagerUserPrompt(inputs);

  // ─── Try streaming first ─────────────────────────────────────────────────
  try {
    let finishObject: ManagerSchema | undefined;
    let finishUsage: LanguageModelUsage | undefined;

    const streamResult = streamObject({
      model: deepseek("deepseek-chat"),
      system,
      prompt,
      schema: managerSchema,
      maxOutputTokens: MANAGER_MAX_TOKENS,
      onFinish: ({ object, usage }) => {
        finishObject = object as ManagerSchema | undefined;
        finishUsage = usage;
      },
    });

    for await (const partial of streamResult.partialObjectStream) {
      write({
        t: "manager_partial",
        partial: partial as Partial<ManagerSchema>,
      });
    }

    if (finishUsage) opts.onLlmUsage?.(finishUsage);
    if (opts.logContext) {
      logAiStage(
        opts.logContext,
        "manager-stream-complete",
        "Manager stream finished.",
      );
    }

    const output = finishObject;
    if (!output) throw new Error("Manager produced no output after streaming.");

    write({ t: "manager_complete", manager: output });
    return output;
  } catch (error) {
    if (opts.logContext) {
      logAiError(opts.logContext, "manager-stream-failed", error);
    } else {
      console.warn(
        `${LOG_PREFIX} Streaming failed, falling back to generateObject:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ─── Fallback: non-streaming generateObject ──────────────────────────────
  const provider = getDefaultAiProvider();

  try {
    const { object, usage } = await provider.generateObject<ManagerSchema>({
      system,
      prompt,
      schema: managerSchema,
      maxOutputTokens: MANAGER_MAX_TOKENS,
    });
    opts.onLlmUsage?.(usage);
    if (opts.logContext) {
      logAiStage(
        opts.logContext,
        "manager-fallback-complete",
        "Manager fallback finished.",
      );
    }
    write({ t: "manager_complete", manager: object });
    return object;
  } catch (error) {
    if (opts.logContext) {
      logAiError(opts.logContext, "manager-fallback-failed", error);
    } else {
      console.warn(
        `${LOG_PREFIX} Fallback attempt failed, retrying with minimal prompt:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ─── Last resort: minimal stripped prompt ────────────────────────────────
  const minimalPrompt = `${inputs.query}\n\nAnalyze this request and produce a concise PRD with name, keyFeatures, and builderTodo. Keep it focused.`;
  const { object, usage } = await provider.generateObject<ManagerSchema>({
    system,
    prompt: minimalPrompt,
    schema: managerSchema,
    maxOutputTokens: MANAGER_MAX_TOKENS,
  });
  opts.onLlmUsage?.(usage);
  if (opts.logContext) {
    logAiStage(
      opts.logContext,
      "manager-retry-complete",
      "Manager minimal-prompt retry finished.",
    );
  }
  write({ t: "manager_complete", manager: object });
  return object;
}
