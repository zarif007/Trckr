/**
 * Orchestrates the multi-agent build-tracker pipeline: Manager → Master Data → Builder → Postprocess.
 *
 * Writes phase markers and agent events to a stream controller (NDJSON). See README in this folder.
 */

import type { LanguageModelUsage } from "ai";

import type { RequestLogContext } from "@/lib/api";
import { logAiError, logAiStage } from "@/lib/ai";
import { encodeEvent, type AgentStreamEvent } from "@/lib/agent/events";
import type { BuilderOutput } from "@/lib/agent/builder-schema";

import type { PromptInputs } from "./prompts";
import { runManagerAgent } from "./manager-agent";
import { runMasterDataAgent } from "./master-data-agent";
import { runBuilderAgent } from "./builder-agent";
import { runPostprocessWithBuilderRepairs } from "./postprocess-repair-loop";
import {
  shouldUsePhasedBuilder,
  runPhasedBuilderAgent,
} from "./phased-builder";

export interface OrchestrateOptions {
  logContext?: RequestLogContext;
  userId?: string;
  projectId?: string | null;
  moduleId?: string | null;
  masterDataScope?: string | null;
  currentTracker?: Record<string, unknown> | null;
  onManagerLlmUsage?: (usage: LanguageModelUsage) => void;
  onBuilderLlmUsage?: (usage: LanguageModelUsage) => void;
}

/**
 * Run the full Manager → Master Data → Builder pipeline, writing NDJSON events to the stream.
 *
 * Phases:
 * 1. Manager — structured plan + optional `buildManifest`
 * 2. Master Data — pre-resolve external trackers (module/project scope only)
 * 3. Builder — single-pass or phased (large greenfield plans); then postprocess with repair loop
 *
 * Errors bubble to the caller; the route handler writes an `error` event and closes the stream.
 */
export async function orchestrateBuildTracker(
  inputs: PromptInputs,
  controller: ReadableStreamDefaultController<Uint8Array>,
  opts: OrchestrateOptions = {},
): Promise<void> {
  const encoder = new TextEncoder();

  const write = (event: AgentStreamEvent): void => {
    controller.enqueue(encoder.encode(encodeEvent(event)));
  };

  write({ t: "phase", phase: "manager" });
  if (opts.logContext)
    logAiStage(opts.logContext, "manager-start", "Starting manager agent.");

  const manager = await runManagerAgent(inputs, write, {
    logContext: opts.logContext,
    onLlmUsage: opts.onManagerLlmUsage,
  });

  const requiredMasterData = manager.requiredMasterData ?? [];
  const effectiveScope = opts.masterDataScope?.trim();
  const needsMasterData =
    requiredMasterData.length > 0 &&
    !!opts.userId &&
    !!opts.projectId &&
    (effectiveScope === "module" || effectiveScope === "project");

  let builderInputs: PromptInputs = inputs;

  if (needsMasterData) {
    write({ t: "phase", phase: "master-data" });
    try {
      const resolvedMasterData = await runMasterDataAgent(
        requiredMasterData,
        write,
        {
          logContext: opts.logContext,
          userId: opts.userId!,
          projectId: opts.projectId!,
          moduleId: opts.moduleId,
          scope: effectiveScope as "module" | "project",
        },
      );
      if (resolvedMasterData.length) {
        builderInputs = {
          ...inputs,
          resolvedMasterData,
          masterDataScope: effectiveScope,
        };
      }
    } catch (err) {
      if (opts.logContext)
        logAiError(opts.logContext, "master-data-agent-failed", err);
    }
  }

  write({ t: "phase", phase: "builder" });
  if (opts.logContext)
    logAiStage(opts.logContext, "builder-start", "Starting builder agent.");

  let builderOutput: BuilderOutput;
  if (shouldUsePhasedBuilder(manager, builderInputs)) {
    if (opts.logContext) {
      logAiStage(
        opts.logContext,
        "builder-phased",
        "Using phased builder (skeleton + patch) for large plan.",
      );
    }
    builderOutput = await runPhasedBuilderAgent(
      builderInputs,
      manager,
      write,
      {
        logContext: opts.logContext,
        onLlmUsage: opts.onBuilderLlmUsage,
      },
    );
  } else {
    builderOutput = await runBuilderAgent(builderInputs, manager, write, {
      logContext: opts.logContext,
      onLlmUsage: opts.onBuilderLlmUsage,
    });
  }

  if (!opts.userId) {
    write({ t: "builder_finish", output: builderOutput });
    return;
  }

  const scopeForPost = effectiveScope ?? "tracker";
  const postProcessed = await runPostprocessWithBuilderRepairs({
    builderInputs,
    manager,
    initialOutput: builderOutput,
    baseTracker: opts.currentTracker ?? null,
    masterDataScope: scopeForPost,
    userId: opts.userId,
    projectId: opts.projectId ?? null,
    moduleId: opts.moduleId ?? null,
    write,
    logContext: opts.logContext,
    onBuilderLlmUsage: opts.onBuilderLlmUsage,
  });

  write({
    t: "builder_finish",
    output: postProcessed.output,
    toolCalls: postProcessed.toolCalls,
  });
}
