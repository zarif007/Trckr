/**
 * Prompt assembly for the multi-agent build-tracker flow.
 *
 * Manager and Builder each have their own focused system prompt.
 * The Manager's structured plan is injected into the Builder's user prompt
 * so the Builder knows exactly what to implement.
 */

import managerPrompt from '@/lib/prompts/manager'
import trackerBuilderPrompt from '@/lib/prompts/trackerBuilder'
import type { ManagerSchema } from '@/lib/schemas/multi-agent'

export interface PromptInputs {
  query: string
  currentStateBlock: string
  /** True when currentStateBlock is full "Current Tracker State (JSON)" (patch mode). */
  hasFullTrackerStateForPatch: boolean
  conversationContext: string
  hasMessages: boolean
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
OUTPUT LIMIT: ~2K token budget — be concise and focused.`.trim()
}

/**
 * Builder agent system prompt.
 * The builder implements the schema from the manager's plan, which arrives in the user message.
 */
export function getBuilderSystemPrompt(): string {
  return `${trackerBuilderPrompt}

You are the Builder Agent. The Manager Agent has analyzed the requirements and provided a structured plan
in the user message (between the "=== Manager Plan ===" markers). Implement the tracker schema
exactly according to that plan.

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

OUTPUT LIMIT: You have a strict ~8K token budget. Always output valid, complete JSON: close every brace and bracket.
If the tracker would be very large, output a complete but minimal tracker (fewer optional fields); the user can ask to add more.`.trim()
}

// ─── User Prompts ──────────────────────────────────────────────────────────────

/**
 * Build the manager user prompt from the request inputs.
 * Provides context and asks the manager to produce a PRD + builderTodo.
 */
export function buildManagerUserPrompt(inputs: PromptInputs): string {
  const { query, currentStateBlock, conversationContext, hasMessages, hasFullTrackerStateForPatch } =
    inputs
  const prefix = currentStateBlock + conversationContext
  const stateTail = hasFullTrackerStateForPatch
    ? ' There is an existing tracker in context — analyze it and plan specific changes.'
    : ''

  if (conversationContext) {
    return (
      prefix +
      `User: ${query}\n\nBased on our conversation, analyze what the user wants to ${hasMessages ? 'update or create' : 'build'} and produce a comprehensive PRD + builderTodo.${stateTail}`
    )
  }

  const createLine = hasFullTrackerStateForPatch
    ? `Using the Current Tracker State above, analyze the user's request and produce a PRD + builderTodo for the changes needed.`
    : `Analyze the user's request and produce a comprehensive PRD + builderTodo for what needs to be built.`

  return prefix + `User: ${query}\n\n${createLine}`
}

/**
 * Build the builder user prompt, injecting the manager's structured plan.
 * The plan block gives the builder clear, authoritative instructions.
 */
export function buildBuilderUserPrompt(inputs: PromptInputs, manager: ManagerSchema): string {
  const { query, currentStateBlock, conversationContext, hasFullTrackerStateForPatch } = inputs
  const managerBlock = formatManagerPlan(manager)
  const prefix = currentStateBlock + conversationContext
  const stateTail = hasFullTrackerStateForPatch
    ? ' Start from the Current Tracker State above when present.'
    : ''

  return `${prefix}${managerBlock}\n\nUser Request: ${query}\n\nImplement the tracker schema according to the Manager's plan above.${stateTail}`
}

/**
 * Fallback prompts for generateObject when builder streaming fails.
 * Each is progressively simpler to maximize chance of valid JSON.
 */
export function buildBuilderFallbackPrompts(
  inputs: PromptInputs,
  manager: ManagerSchema,
): string[] {
  const { query, currentStateBlock, conversationContext, hasFullTrackerStateForPatch } = inputs
  const managerBlock = formatManagerPlan(manager)
  const stateHint =
    currentStateBlock && hasFullTrackerStateForPatch ? ' Start from the Current Tracker State above.' : ''

  return [
    `${currentStateBlock}${conversationContext}${managerBlock}\n\nUser: ${query}\n\nSimplify: output a minimal valid tracker (one tab, one section, one grid, a few fields) that matches the user's intent. Output only "tracker" in valid JSON.${stateHint}`,
    `${currentStateBlock}User: ${query}\n\nOutput only a minimal tracker JSON: one tab, one section, one grid, and one text field. Include "tracker" with tabs, sections, grids, fields, layoutNodes, and bindings.${stateHint}`,
    'Output a minimal valid tracker JSON with one tab "Main", one section "Default", one grid "Grid 1", one text field "Name", and empty layoutNodes and bindings.',
  ]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatManagerPlan(manager: ManagerSchema): string {
  const lines: string[] = ['=== Manager Plan ===']

  if (manager.prd?.name) {
    lines.push(`Name: ${manager.prd.name}`)
  }

  if (manager.prd?.keyFeatures?.length) {
    lines.push(`Key Features:`)
    for (const feature of manager.prd.keyFeatures) {
      lines.push(`  - ${feature}`)
    }
  }

  if (manager.builderTodo?.length) {
    lines.push(`Builder Tasks:`)
    manager.builderTodo.forEach((item, i) => {
      const action = item.action ?? 'create'
      const target = item.target ?? ''
      const task = item.task ?? ''
      lines.push(`  ${i + 1}. [${action}] ${target}: ${task}`)
    })
  }

  lines.push('=== End Manager Plan ===')
  return lines.join('\n')
}
