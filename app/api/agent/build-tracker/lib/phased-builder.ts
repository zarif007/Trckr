/**
 * Multi-pass builder for large manager plans: layout skeleton first, then trackerPatch
 * for fields/bindings/rules. Reduces single-response token pressure vs one monolithic JSON.
 */

import type { ManagerSchema } from "@/lib/schemas/multi-agent";
import type { BuilderOutput } from "@/lib/agent/builder-schema";
import type { AgentStreamEvent } from "@/lib/agent/events";
import { applyTrackerPatch } from "@/app/tracker/utils/mergeTracker";
import {
  buildCurrentStateBlock,
  hasFullTrackerStateForPatch,
} from "@/lib/tracker-prompt/context";
import {
  buildBuilderStableUserMessagePrefix,
  type PromptInputs,
} from "./prompts";
import { runBuilderAgent, type RunBuilderAgentOptions } from "./builder-agent";
import {
  BUILDER_MAX_TOKENS,
  PHASED_BUILDER_MIN_QUERY_CHARS,
  PHASED_BUILDER_MIN_TODO_ITEMS,
} from "./constants";
import { materializeBuilderTracker, repairTrackerStructure } from "./postprocess";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function shouldUsePhasedBuilder(
  manager: ManagerSchema,
  inputs: PromptInputs,
): boolean {
  if (inputs.hasFullTrackerStateForPatch) return false;
  if ((manager.builderTodo?.length ?? 0) >= PHASED_BUILDER_MIN_TODO_ITEMS)
    return true;
  if (inputs.query.length >= PHASED_BUILDER_MIN_QUERY_CHARS) return true;
  return false;
}

function mergePhase(
  base: Record<string, unknown>,
  output: BuilderOutput,
): Record<string, unknown> {
  if (output.trackerPatch && isPlainObject(base)) {
    return applyTrackerPatch(
      base as unknown as Parameters<typeof applyTrackerPatch>[0],
      output.trackerPatch as Parameters<typeof applyTrackerPatch>[1],
    ) as unknown as Record<string, unknown>;
  }
  if (output.tracker && isPlainObject(output.tracker)) {
    return output.tracker as Record<string, unknown>;
  }
  return base;
}

/**
 * Run builder in two LLM passes: skeleton tracker, then trackerPatch for the full data model.
 */
export async function runPhasedBuilderAgent(
  inputs: PromptInputs,
  manager: ManagerSchema,
  write: (event: AgentStreamEvent) => void,
  opts: RunBuilderAgentOptions = {},
): Promise<BuilderOutput> {
  const stable = buildBuilderStableUserMessagePrefix(inputs, manager);
  const phase1Prompt = `${stable}\n\nUser Request: ${inputs.query}\n\n=== PHASE 1 of 2 — LAYOUT SKELETON ===
Output a full "tracker" with masterDataScope, tabs, sections, and grids exactly as the Manager plan requires.
Use fields: [], layoutNodes: [], bindings: {} for this phase only.
Use text/string fields only if you absolutely must (prefer empty fields array).
Every data grid must include at least one "table" view in views.
Omit heavy rules for now (validations and calculations may be {} or omitted if allowed).`;

  const phase1 = await runBuilderAgent(inputs, manager, write, {
    ...opts,
    overrideUserPrompt: phase1Prompt,
    preferGenerateObject: true,
    maxOutputTokens: BUILDER_MAX_TOKENS,
  });

  let accumulated = materializeBuilderTracker(phase1, null);
  if (!accumulated) {
    throw new Error("Phased builder: phase 1 produced no tracker.");
  }
  accumulated = repairTrackerStructure(accumulated);

  const inputsWithSkeleton: PromptInputs = {
    ...inputs,
    currentStateBlock: buildCurrentStateBlock(accumulated),
    hasFullTrackerStateForPatch: hasFullTrackerStateForPatch(accumulated),
  };

  const phase2Prompt = `${buildBuilderStableUserMessagePrefix(inputsWithSkeleton, manager)}\n\nUser Request: ${inputs.query}\n\n=== PHASE 2 of 2 — DATA MODEL ===
The "Current Tracker State (JSON)" block is the PHASE 1 skeleton. Output ONLY "trackerPatch" (not a full tracker).
Add every field, layoutNode, binding, fieldRule, validation, and calculation from the Manager plan.
Preserve existing tab/section/grid ids. Follow Pre-Resolved Master Data binding rules when present.`;

  const phase2 = await runBuilderAgent(inputsWithSkeleton, manager, write, {
    ...opts,
    overrideUserPrompt: phase2Prompt,
    preferGenerateObject: true,
    maxOutputTokens: BUILDER_MAX_TOKENS,
  });

  accumulated = mergePhase(accumulated, phase2);
  accumulated = repairTrackerStructure(accumulated);

  return {
    tracker: accumulated,
    masterDataTrackers:
      phase2.masterDataTrackers ?? phase1.masterDataTrackers,
  } as BuilderOutput;
}
