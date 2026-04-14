/**
 * Prompt assembly for the multi-agent build-tracker flow.
 *
 * Manager and Builder each have their own focused system prompt.
 * The Manager's structured plan is injected into the Builder's user prompt
 * so the Builder knows exactly what to implement.
 */

import managerPrompt from "@/lib/prompts/manager";
import trackerBuilderPrompt from "@/lib/prompts/trackerBuilder";
import type { ManagerSchema } from "@/lib/schemas/multi-agent";
import type { ResolvedMasterDataEntry } from "./master-data-agent";

export type { ResolvedMasterDataEntry };

export interface PromptInputs {
  query: string;
  currentStateBlock: string;
  /** True when currentStateBlock is full "Current Tracker State (JSON)" (patch mode). */
  hasFullTrackerStateForPatch: boolean;
  conversationContext: string;
  hasMessages: boolean;
  /** Pre-resolved master data entries (module/project scope). When present, builder uses real IDs. */
  resolvedMasterData?: ResolvedMasterDataEntry[] | null;
  masterDataScope?: string | null;
}

// ─── System Prompts ────────────────────────────────────────────────────────────

/**
 * Manager agent system prompt.
 * The manager only plans — it does not generate the schema.
 */
export function getManagerSystemPrompt(): string {
  return `${managerPrompt}

Your structured output (thinking, prd, builderTodo) will be passed directly to the Builder Agent.
Keep your thinking brief (2–4 sentences). Do not include a "summary" field in your response.
OUTPUT LIMIT: stay within the model output budget — keep thinking brief; prioritize a complete builderTodo and buildManifest for large trackers.`.trim();
}

/**
 * Builder agent system prompt.
 * The builder implements the schema from the manager's plan, which arrives in the user message.
 */
export function getBuilderSystemPrompt(): string {
  return `${trackerBuilderPrompt}

=== BUILDER PHILOSOPHY ===

You are the Builder Agent. The Tracker Architect (Manager Agent) has designed the complete information architecture
and decomposed it into detailed builderTodo phases. Your ONLY job is to implement that design exactly.

The Manager has:
1. Analyzed domain requirements
2. Designed information architecture (tabs, sections, grids)
3. Designed data model (fields, types, constraints)
4. Planned interactions (bindings, rules, validations, calculations)
5. Validated the architecture for scalability and correctness
6. Decomposed it into sequential, phased builderTodo tasks

YOUR JOB: Execute builderTodo faithfully. Do not simplify, override, or redesign. Honor every architectural decision.

=== CRITICAL RULES ===

FOLLOW BUILDERTHREAD PHASES IN ORDER:
- Phase 1: TAB STRUCTURE — create all tabs exactly as specified
- Phase 2: SECTIONS & LAYOUT — create sections on each tab
- Phase 3: PRIMARY GRIDS & FIELDS — create main data grids with all fields
- Phase 4: MASTER DATA GRIDS — create all reference/options grids
- Phase 5: BINDINGS — wire all select/multiselect fields to grids
- Phase 6: FIELD RULES — add conditional visibility/required/disabled
- Phase 7: VALIDATIONS — add complex validation rules
- Phase 8: CALCULATIONS — add computed/derived fields

BUILD COMPLETENESS:
- If the Manager designed 4 tabs, create all 4 tabs with all their sections and grids.
- If the Manager designed 2 grids per tab, create all grids on all tabs.
- If the Manager specified field-level constraints, configs, and bindings, implement them all.
- Never skip phases or defer parts to later — implement each phase fully.

NO OVERRIDES:
- Do not consolidate multiple tabs into one.
- Do not skip master data grids.
- Do not omit field rules or validations.
- Do not alter the tab/section/grid structure.
- The Manager justified every structural decision.

OUTPUT COMPLETENESS:
- Your schema must reflect the ENTIRE builderTodo plan.
- Every tab, section, grid, and field listed in builderTodo MUST appear in your output.
- Every binding, rule, validation, and calculation in builderTodo MUST be in your output.

MASTER DATA SCOPE RULE (module/project scope):
- If "Pre-Resolved Master Data" is present in the user message: those entities ALREADY EXIST in external trackers. Do NOT create any local grids for them (no supplier_grid, no warehouse_grid, etc.).
- Only create grids for local-only entities that are NOT listed in "Pre-Resolved Master Data".
- All select/multiselect fields for external entities MUST use the foreign binding from "Pre-Resolved Master Data" — not "ThisTracker" or local optionsGrid references.

CRITICAL OUTPUT RULES:
- Output EITHER "tracker" (full schema) OR "trackerPatch" (incremental changes). Never both.
- Never output "manager" — only "tracker", "trackerPatch", and/or "masterDataTrackers".

PATCH MODE (when "Current Tracker State (JSON)" is present in the user message):
- Output ONLY "trackerPatch" (do not output the full "tracker").
- Include ONLY the items that changed.
- For tabs/sections/grids/fields/layoutNodes: include the item with its id.
- To delete an item, include it with "_delete": true.
- For new items, include all required fields (id, name, placeId, config, etc.).
- For updates, include only changed fields (plus id).
- For bindings, set keys in "bindings"; set a key to null to delete it. Optionally list keys in "bindingsRemove".
- For validations, set keys in "validations". Optionally list keys in "validationsRemove".
- For calculations, set keys in "calculations". Optionally list keys in "calculationsRemove".
- For fieldRules, include the full updated fieldRules array if it changed.

GREENFIELD (no "Current Tracker State (JSON)" in this request):
- Put primary sections/grids on overview_tab by default.
- Do NOT emit an empty overview_tab while placing all main content on another tab.
- For multi-tab requests, give every tab at least one section.

OUTPUT LIMIT: You have a finite output budget (~8K tokens max). Always output valid, complete JSON: close every brace and bracket.
If the tracker would be very large, keep configs lean but do NOT drop tabs, grids, fields, or bindings required by the Manager plan.`.trim();
}

// ─── User Prompts ──────────────────────────────────────────────────────────────

/**
 * Build the manager user prompt from the request inputs.
 * Provides context and asks the manager to produce a PRD + builderTodo.
 */
export function buildManagerUserPrompt(inputs: PromptInputs): string {
  const {
    query,
    currentStateBlock,
    conversationContext,
    hasMessages,
    hasFullTrackerStateForPatch,
    masterDataScope,
  } = inputs;
  const scopeBlock = formatMasterDataScope(masterDataScope);
  const prefix = scopeBlock + currentStateBlock + conversationContext;
  const stateTail = hasFullTrackerStateForPatch
    ? " There is an existing tracker in context — analyze it and plan specific changes."
    : "";

  if (conversationContext) {
    return (
      prefix +
      `User: ${query}\n\nBased on our conversation, analyze what the user wants to ${hasMessages ? "update or create" : "build"} and produce a comprehensive PRD + builderTodo.${stateTail}`
    );
  }

  const createLine = hasFullTrackerStateForPatch
    ? `Using the Current Tracker State above, analyze the user's request and produce a PRD + builderTodo for the changes needed.`
    : `Analyze the user's request and produce a comprehensive PRD + builderTodo for what needs to be built.`;

  return prefix + `User: ${query}\n\n${createLine}`;
}

/**
 * Build the builder user prompt, injecting the manager's structured plan.
 * The plan block gives the builder clear, authoritative instructions.
 */
export function buildBuilderUserPrompt(
  inputs: PromptInputs,
  manager: ManagerSchema,
): string {
  const {
    query,
    currentStateBlock,
    conversationContext,
    hasFullTrackerStateForPatch,
    resolvedMasterData,
    masterDataScope,
  } = inputs;
  const managerBlock = formatManagerPlan(manager);
  const scopeBlock = formatMasterDataScope(masterDataScope);
  const prefix = scopeBlock + currentStateBlock + conversationContext;
  const stateTail = hasFullTrackerStateForPatch
    ? " Start from the Current Tracker State above when present."
    : "";
  const mdBlock = resolvedMasterData?.length
    ? formatResolvedMasterData(resolvedMasterData)
    : "";

  const manifestBlock =
    manager.buildManifest != null || (manager.builderTodo?.length ?? 0) >= 10
      ? `\n${buildManagerManifestText(manager)}`
      : "";

  return `${prefix}${mdBlock}${managerBlock}${manifestBlock}\n\nUser Request: ${query}\n\nImplement the tracker schema according to the Manager's plan above.${stateTail}`;
}

/**
 * Compact checklist derived from the manager output (for retries and completeness).
 */
export function buildManagerManifestText(manager: ManagerSchema): string {
  const lines: string[] = ["=== Build manifest (checklist) ==="];
  const m = manager.buildManifest;
  if (m?.tabIds?.length) {
    lines.push(`Required tab ids (${m.tabIds.length}): ${m.tabIds.join(", ")}`);
  }
  if (m?.gridIds?.length) {
    lines.push(
      `Required grid ids (${m.gridIds.length}): ${m.gridIds.join(", ")}`,
    );
  }
  if (m?.selectFieldPaths?.length) {
    lines.push(
      `Select/multiselect binding paths (${m.selectFieldPaths.length}): ${m.selectFieldPaths.join(", ")}`,
    );
  }
  const todos = manager.builderTodo ?? [];
  const maxLines = 80;
  const perTaskMax = 160;
  lines.push(
    `\nbuilderTodo summary (${todos.length} tasks, each truncated to ${perTaskMax} chars):`,
  );
  todos.slice(0, maxLines).forEach((item, i) => {
    const action = item.action ?? "";
    const target = item.target ?? "";
    const task = (item.task ?? "").slice(0, perTaskMax);
    lines.push(`${i + 1}. [${action}] ${target}: ${task}`);
  });
  if (todos.length > maxLines) {
    lines.push(`… plus ${todos.length - maxLines} more tasks (implement all in schema).`);
  }
  lines.push("=== End build manifest ===\n");
  return lines.join("\n");
}

/**
 * Stable prefix for every builder attempt: scope, tracker state, conversation, master data IDs, full manager plan, manifest.
 * Never omit Pre-Resolved Master Data on later retries — foreign bindings depend on it.
 */
export function buildBuilderStableUserMessagePrefix(
  inputs: PromptInputs,
  manager: ManagerSchema,
): string {
  const {
    currentStateBlock,
    conversationContext,
    resolvedMasterData,
    masterDataScope,
  } = inputs;
  const managerBlock = formatManagerPlan(manager);
  const scopeBlock = formatMasterDataScope(masterDataScope);
  const mdBlock = resolvedMasterData?.length
    ? formatResolvedMasterData(resolvedMasterData)
    : "";
  const manifest = buildManagerManifestText(manager);
  return `${scopeBlock}${currentStateBlock}${conversationContext}${mdBlock}${managerBlock}\n${manifest}`;
}

export type BuilderRepairPromptParams = {
  serverErrors: string;
  completenessGaps?: string[];
  /** Truncated JSON of last builder output for context */
  priorTrackerSummary?: string;
};

/**
 * User message for a post-validation repair pass (after postprocess failed).
 */
export function buildBuilderRepairUserPrompt(
  inputs: PromptInputs,
  manager: ManagerSchema,
  params: BuilderRepairPromptParams,
): string {
  const prefix = buildBuilderStableUserMessagePrefix(inputs, manager);
  const { query, hasFullTrackerStateForPatch } = inputs;
  const stateHint = hasFullTrackerStateForPatch
    ? " Use trackerPatch against Current Tracker State when patch mode applies; otherwise output a full tracker."
    : " Output a full tracker (greenfield).";
  const gapLines = (params.completenessGaps ?? []).filter(Boolean);
  const gaps =
    gapLines.length > 0
      ? `\n\nCompleteness gaps detected:\n${gapLines.map((g) => `- ${g}`).join("\n")}`
      : "";
  const prior =
    params.priorTrackerSummary && params.priorTrackerSummary.trim()
      ? `\n\nPrevious draft (excerpt, fix — do not shrink the plan):\n${params.priorTrackerSummary}`
      : "";

  return `${prefix}\n\nUser Request: ${query}\n\n=== SERVER VALIDATION FAILED ===\n${params.serverErrors}${gaps}${prior}\n\nFix the schema so it passes validation and binding rules. Preserve the Manager architecture (tabs/sections/grids/fields).${stateHint}`;
}

/**
 * Fallback prompts for generateObject when builder streaming fails.
 * Each pass keeps full context (manager plan + pre-resolved master data) and nudges toward valid JSON without collapsing to a toy tracker.
 */
export function buildBuilderFallbackPrompts(
  inputs: PromptInputs,
  manager: ManagerSchema,
): string[] {
  const { query, hasFullTrackerStateForPatch, currentStateBlock } = inputs;
  const prefix = buildBuilderStableUserMessagePrefix(inputs, manager);
  const stateHint =
    currentStateBlock && hasFullTrackerStateForPatch
      ? " Start from the Current Tracker State above."
      : "";
  const baseUser = `User Request: ${query}\n\n`;

  return [
    `${prefix}${baseUser}The stream failed or returned incomplete JSON. Output a FULL "tracker" implementing the Manager plan and checklist above. Prioritize structural completeness (tabs, sections, grids, fields, layoutNodes, bindings for every select/multiselect). Keep labels short if needed.${stateHint}`,
    `${prefix}${baseUser}Output a FULL "tracker" with dense field ui labels and lean configs, but do NOT drop tabs, grids, fields, or foreign bindings from Pre-Resolved Master Data.${stateHint}`,
    `${prefix}${baseUser}Output valid complete JSON only. Full tracker. You may omit advanced validations/calculations/fieldRules if necessary, but NOT tabs, grids, fields, layoutNodes, or bindings for options fields.${stateHint}`,
    `${prefix}${baseUser}Last attempt: minimal optional configs and short strings; still implement every builderTodo line as real schema elements and satisfy Pre-Resolved Master Data binding rules.${stateHint}`,
  ];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatManagerPlan(manager: ManagerSchema): string {
  const lines: string[] = ["=== Manager Plan ==="];

  // PRD section
  if (manager.prd?.name) {
    lines.push(`\n📋 TRACKER: ${manager.prd.name}`);
  }

  if (manager.prd?.keyFeatures?.length) {
    lines.push(`\nKey Features:`);
    for (const feature of manager.prd.keyFeatures) {
      lines.push(` • ${feature}`);
    }
  }

  // Architectural thinking (if available in thinking field)
  if (manager.thinking) {
    lines.push(`\n🏗️ ARCHITECTURAL THINKING:`);
    lines.push(manager.thinking);
  }

  const manifest = manager.buildManifest;
  if (
    manifest &&
    (manifest.tabIds?.length ||
      manifest.gridIds?.length ||
      manifest.selectFieldPaths?.length)
  ) {
    lines.push("\n📌 BUILD MANIFEST (machine checklist):");
    if (manifest.tabIds?.length) {
      lines.push(` tabIds: ${manifest.tabIds.join(", ")}`);
    }
    if (manifest.gridIds?.length) {
      lines.push(` gridIds: ${manifest.gridIds.join(", ")}`);
    }
    if (manifest.selectFieldPaths?.length) {
      lines.push(` selectFieldPaths: ${manifest.selectFieldPaths.join(", ")}`);
    }
  }

  // BuilderTodo organized by phase
  if (manager.builderTodo?.length) {
    lines.push(
      `\n📐 ARCHITECTURE BLUEPRINT (${manager.builderTodo.length} tasks):`,
    );

    let currentPhase = "";
    let phaseNumber = 0;

    manager.builderTodo.forEach((item, i) => {
      const action = item.action ?? "create";
      const target = item.target ?? "";
      const task = item.task ?? "";

      // Detect phase changes based on comments or task descriptions
      const phaseMatch = task.match(/PHASE (\d+):\s*([A-Z_\s]+)/i);
      if (phaseMatch) {
        const newPhase = phaseMatch[2].trim();
        if (newPhase !== currentPhase) {
          currentPhase = newPhase;
          phaseNumber++;
          lines.push(`\n ➤ PHASE ${phaseNumber}: ${currentPhase}`);
        }
      }

      lines.push(` ${i + 1}. [${action}] ${target}: ${task}`);
    });
  }

  lines.push("\n=== End Manager Plan ===");
  return lines.join("\n");
}

function formatResolvedMasterData(entries: ResolvedMasterDataEntry[]): string {
  const lines = ["\n=== Pre-Resolved Master Data ==="];
  lines.push(
    "These master data trackers are ALREADY IN THE DATABASE. Use their EXACT IDs in bindings.",
  );
  lines.push(
    'STRICT RULES: Do NOT use "__master_data__" placeholder. Do NOT create local grids for ANY of these entities. Do NOT output masterDataTrackers.',
  );
  const entityNames = entries.map((e) => `"${e.name}"`).join(", ");
  lines.push(
    `Do NOT create grids named after or related to: ${entityNames}. These exist externally.\n`,
  );
  for (const e of entries) {
    lines.push(`• key: "${e.key}" name: "${e.name}"`);
    lines.push(
      ` trackerId: "${e.trackerId}" gridId: "${e.gridId}" labelFieldId: "${e.labelFieldId}"`,
    );
    lines.push(
      ` → use binding: { optionsSourceSchemaId: "${e.trackerId}", optionsSourceKey: "${e.key}", optionsGrid: "${e.gridId}", labelField: "${e.gridId}.${e.labelFieldId}" }`,
    );
  }
  lines.push("\n=== End Pre-Resolved Master Data ===\n");
  return lines.join("\n");
}

function formatMasterDataScope(scope?: string | null): string {
  const trimmed = typeof scope === "string" ? scope.trim() : "";
  if (!trimmed) return "";
  return `Master Data Scope: ${trimmed}\n\n`;
}
