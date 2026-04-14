/**
 * Postprocess with bounded completeness + validation repair passes.
 *
 * Separated from {@link orchestrateBuildTracker} so the route orchestration file stays a thin coordinator.
 */

import type { LanguageModelUsage } from "ai";

import type { RequestLogContext } from "@/lib/api";
import { logAiError, logAiStage } from "@/lib/ai";
import { buildCompletenessGapMessages } from "@/lib/agent/build-tracker-completeness";
import type { BuilderOutput } from "@/lib/agent/builder-schema";
import { errorMessageFromUnknown } from "@/lib/agent/build-tracker-errors";
import { summarizeTrackerDraftForRepairPrompt } from "@/lib/agent/build-tracker-repair-draft";
import type { AgentStreamEvent } from "@/lib/agent/events";
import type { ManagerSchema } from "@/lib/schemas/multi-agent";

import { runBuilderAgent, type RunBuilderAgentOptions } from "./builder-agent";
import {
  MAX_POSTPROCESS_REPAIR_ATTEMPTS,
  REPAIR_TRACKER_EXCERPT_MAX_CHARS,
} from "./constants";
import { buildBuilderRepairUserPrompt, type PromptInputs } from "./prompts";
import {
  materializeBuilderTracker,
  postProcessBuilderOutput,
  type PostProcessResult,
} from "./postprocess";

export type PostprocessRepairLoopOptions = {
  builderInputs: PromptInputs;
  manager: ManagerSchema;
  initialOutput: BuilderOutput;
  baseTracker: Record<string, unknown> | null;
  masterDataScope: string;
  userId: string;
  projectId: string | null;
  moduleId: string | null;
  write: (event: AgentStreamEvent) => void;
  logContext?: RequestLogContext;
  onBuilderLlmUsage?: (usage: LanguageModelUsage) => void;
};

function priorSummaryForRepair(
  output: BuilderOutput,
  baseTracker: Record<string, unknown> | null,
): string {
  const draft = materializeBuilderTracker(output, baseTracker);
  return summarizeTrackerDraftForRepairPrompt(
    draft,
    REPAIR_TRACKER_EXCERPT_MAX_CHARS,
  );
}

/**
 * Runs {@link postProcessBuilderOutput} with up to {@link MAX_POSTPROCESS_REPAIR_ATTEMPTS}
 * repair builder passes when completeness heuristics or postprocess validation fails.
 */
export async function runPostprocessWithBuilderRepairs(
  opts: PostprocessRepairLoopOptions,
): Promise<PostProcessResult> {
  const {
    builderInputs,
    manager,
    initialOutput,
    baseTracker,
    masterDataScope,
    userId,
    projectId,
    moduleId,
    write,
    logContext,
    onBuilderLlmUsage,
  } = opts;

  const builderOpts: RunBuilderAgentOptions = {
    logContext,
    onLlmUsage: onBuilderLlmUsage,
  };

  let workingOutput: BuilderOutput = initialOutput;
  let rebuilds = 0;

  while (rebuilds <= MAX_POSTPROCESS_REPAIR_ATTEMPTS) {
    const draftForGaps = materializeBuilderTracker(workingOutput, baseTracker);
    const completenessGaps = draftForGaps
      ? buildCompletenessGapMessages(manager, draftForGaps)
      : [];

    if (completenessGaps.length > 0 && rebuilds < MAX_POSTPROCESS_REPAIR_ATTEMPTS) {
      if (logContext) {
        logAiStage(
          logContext,
          "builder-completeness-repair",
          `Completeness gaps (${completenessGaps.length}); running repair builder.`,
        );
      }
      workingOutput = await runBuilderAgent(
        builderInputs,
        manager,
        write,
        {
          ...builderOpts,
          overrideUserPrompt: buildBuilderRepairUserPrompt(
            builderInputs,
            manager,
            {
              serverErrors: `Completeness check: ${completenessGaps.join("; ")}`,
              completenessGaps,
              priorTrackerSummary: priorSummaryForRepair(
                workingOutput,
                baseTracker,
              ),
            },
          ),
          preferGenerateObject: true,
        },
      );
      rebuilds++;
      continue;
    }

    try {
      return await postProcessBuilderOutput(workingOutput, {
        masterDataScope,
        userId,
        projectId,
        moduleId,
        baseTracker,
      });
    } catch (err) {
      if (logContext) {
        logAiError(logContext, "postprocess-failed", err);
      }
      if (rebuilds >= MAX_POSTPROCESS_REPAIR_ATTEMPTS) {
        throw err instanceof Error
          ? err
          : new Error(errorMessageFromUnknown(err));
      }
      if (logContext) {
        logAiStage(
          logContext,
          "builder-postprocess-repair",
          `Postprocess failed; repair attempt ${rebuilds + 1}/${MAX_POSTPROCESS_REPAIR_ATTEMPTS}.`,
        );
      }
      const draftAfterFailure = materializeBuilderTracker(
        workingOutput,
        baseTracker,
      );
      const gapsAfterFailure = draftAfterFailure
        ? buildCompletenessGapMessages(manager, draftAfterFailure)
        : [];
      workingOutput = await runBuilderAgent(
        builderInputs,
        manager,
        write,
        {
          ...builderOpts,
          overrideUserPrompt: buildBuilderRepairUserPrompt(
            builderInputs,
            manager,
            {
              serverErrors: errorMessageFromUnknown(err),
              completenessGaps: gapsAfterFailure,
              priorTrackerSummary: priorSummaryForRepair(
                workingOutput,
                baseTracker,
              ),
            },
          ),
          preferGenerateObject: true,
        },
      );
      rebuilds++;
    }
  }

  throw new Error(
    "runPostprocessWithBuilderRepairs: repair loop exhausted without a successful postprocess.",
  );
}
