import managerPrompt from '@/lib/prompts/manager'
import trackerBuilderPrompt from '@/lib/prompts/trackerBuilder'

/**
 * Combined system prompt: Manager + Builder instructions and output rules.
 * Used by the single-shot ai-project/build-tracker endpoint.
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
 - For fieldRules, include the full updated fieldRules array if it changed.

 GREENFIELD (no "Current Tracker State (JSON)" in this request): Put primary sections/grids on **overview_tab** by default. Do **not** emit an empty **overview_tab** while placing all main content on another tab. For multi-tab requests, give every tab at least one section.

 OUTPUT LIMIT: You have a strict token limit (~8K). Keep manager "thinking" brief (2-4 sentences). Do not output a summary in the manager.
 Always output valid, complete JSON: close every brace and bracket. If the tracker would be very large,
 output a complete but minimal tracker (fewer optional fields); the user can ask to add more.
`
}
