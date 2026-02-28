/**
 * System and user prompt assembly for the generate-tracker flow.
 */

import managerPrompt from '@/lib/prompts/manager'
import trackerBuilderPrompt from '@/lib/prompts/trackerBuilder'

export interface PromptInputs {
  query: string
  currentStateBlock: string
  conversationContext: string
  hasMessages: boolean
}

/**
 * Combined system prompt: Manager + Builder instructions and output rules.
 */
export function getCombinedSystemPrompt(): string {
  return `
  ${managerPrompt}
  
  ---
  
  ONCE YOU HAVE COMPLETED THE PRD, act as the "Builder Agent" and implement the technical schema.
  
  ${trackerBuilderPrompt}
  
  CRITICAL: You are a unified system. You MUST generate a response containing TWO parts:
  1. "manager": The breakdown of requirements (thinking, prd, builderTodo). Do NOT include a summary field.
  2. Either "tracker" (full schema) OR "trackerPatch" (incremental changes).

  NEVER stop after the manager object. The user will see an error if neither 'tracker' nor 'trackerPatch' is present.
  You MUST populate the 'tracker' object (first-time build) or 'trackerPatch' (incremental update) based on the manager's PRD.

  PATCH MODE (when "Current Tracker State (JSON)" is present):
  - Output ONLY "trackerPatch" (do not output the full "tracker").
  - Include ONLY the items that changed.
  - For tabs/sections/grids/fields/layoutNodes: include the item with its id (layoutNodes use gridId + fieldId).
  - To delete an item, include it with "_delete": true.
  - For new items, include all required fields (id, name, placeId, config, etc.).
  - For updates, include only changed fields (plus id).
  - For bindings, set keys in "bindings"; set a key to null to delete it. Optionally list keys in "bindingsRemove".
  - For validations, set keys in "validations"; set a key to null to delete it. Optionally list keys in "validationsRemove".
  - For calculations, set keys in "calculations"; set a key to null to delete it. Optionally list keys in "calculationsRemove".
  - For dependsOn, include the full updated dependsOn array if it changed.

  OUTPUT LIMIT: You have a strict token limit (~8K). Keep manager "thinking" brief (2-4 sentences). Do not output a summary in the manager.
  Always output valid, complete JSON: close every brace and bracket. If the tracker would be very large,
  output a complete but minimal tracker (fewer optional fields); the user can ask to add more.
`
}

/**
 * Build the main user prompt from query, current state, and conversation context.
 */
export function buildUserPrompt(inputs: PromptInputs): string {
  const { query, currentStateBlock, conversationContext, hasMessages } = inputs
  const prefix = currentStateBlock + conversationContext
  if (conversationContext) {
    return (
      prefix +
      `User: ${query}\n\nBased on our conversation, ${hasMessages ? 'update or modify' : 'update or create'} the tracker according to the user's latest request. Start from the Current Tracker State above when present.`
    )
  }
  return (
    prefix +
    `User: ${query}\n\n${currentStateBlock ? 'Using the Current Tracker State above, update or create' : 'Create'} the tracker according to the user's request.`
  )
}

/**
 * Fallback prompts used when streaming or first generateObject attempt fails.
 * Each is progressively simpler to maximize chance of valid JSON.
 */
export function buildFallbackPrompts(inputs: PromptInputs): string[] {
  const { query, currentStateBlock, conversationContext } = inputs
  const stateHint = currentStateBlock ? ' Start from the Current Tracker State above.' : ''
  return [
    `${currentStateBlock}${conversationContext}User: ${query}\n\nSimplify the request: output a minimal valid tracker (one tab, one section, one grid, a few fields) that matches the user's intent. Always include both "manager" and "tracker" in valid JSON (manager: thinking, prd, builderTodo — no summary).${stateHint}`,
    `${currentStateBlock}${conversationContext}User: ${query}\n\nOutput only a minimal valid tracker JSON: one tab, one section, one grid, and one text field. Include "manager" (thinking, prd, builderTodo — no summary) and "tracker" with tabs, sections, grids, fields, layoutNodes, and bindings.${stateHint}`,
    'Output a minimal valid tracker JSON with one tab "Main", one section "Default", one grid "Grid 1", one text field "Name", and empty layoutNodes and bindings. Include a brief "manager" object with thinking, prd, and builderTodo (no summary).',
  ]
}
