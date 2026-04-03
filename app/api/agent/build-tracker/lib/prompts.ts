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
import type { ResolvedMasterDataEntry } from './master-data-agent'

export type { ResolvedMasterDataEntry }

export interface PromptInputs {
 query: string
 currentStateBlock: string
 /** True when currentStateBlock is full "Current Tracker State (JSON)" (patch mode). */
 hasFullTrackerStateForPatch: boolean
 conversationContext: string
 hasMessages: boolean
 /** Pre-resolved master data entries (module/project scope). When present, builder uses real IDs. */
 resolvedMasterData?: ResolvedMasterDataEntry[] | null
 masterDataScope?: string | null
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
 const { query, currentStateBlock, conversationContext, hasMessages, hasFullTrackerStateForPatch, masterDataScope } =
 inputs
 const scopeBlock = formatMasterDataScope(masterDataScope)
 const prefix = scopeBlock + currentStateBlock + conversationContext
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
 const { query, currentStateBlock, conversationContext, hasFullTrackerStateForPatch, resolvedMasterData, masterDataScope } = inputs
 const managerBlock = formatManagerPlan(manager)
 const scopeBlock = formatMasterDataScope(masterDataScope)
 const prefix = scopeBlock + currentStateBlock + conversationContext
 const stateTail = hasFullTrackerStateForPatch
 ? ' Start from the Current Tracker State above when present.'
 : ''
 const mdBlock = resolvedMasterData?.length ? formatResolvedMasterData(resolvedMasterData) : ''

 return `${prefix}${mdBlock}${managerBlock}\n\nUser Request: ${query}\n\nImplement the tracker schema according to the Manager's plan above.${stateTail}`
}

/**
 * Fallback prompts for generateObject when builder streaming fails.
 * Each is progressively simpler to maximize chance of valid JSON.
 */
export function buildBuilderFallbackPrompts(
 inputs: PromptInputs,
 manager: ManagerSchema,
): string[] {
 const { query, currentStateBlock, conversationContext, hasFullTrackerStateForPatch, resolvedMasterData, masterDataScope } = inputs
 const managerBlock = formatManagerPlan(manager)
 const scopeBlock = formatMasterDataScope(masterDataScope)
 const stateHint =
 currentStateBlock && hasFullTrackerStateForPatch ? ' Start from the Current Tracker State above.' : ''
 const mdBlock = resolvedMasterData?.length ? formatResolvedMasterData(resolvedMasterData) : ''

 return [
 `${scopeBlock}${currentStateBlock}${conversationContext}${mdBlock}${managerBlock}\n\nUser: ${query}\n\nSimplify: output a minimal valid tracker (one tab, one section, one grid, a few fields) that matches the user's intent. Output only "tracker" in valid JSON.${stateHint}`,
 `${scopeBlock}${currentStateBlock}User: ${query}\n\nOutput only a minimal tracker JSON: one tab, one section, one grid, and one text field. Include "tracker" with tabs, sections, grids, fields, layoutNodes, and bindings.${stateHint}`,
 'Output a minimal valid tracker JSON with one tab "Main", one section "Default", one grid "Grid 1", one text field "Name", and empty layoutNodes and bindings.',
 ]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatManagerPlan(manager: ManagerSchema): string {
 const lines: string[] = ['=== Manager Plan ===']

 // PRD section
 if (manager.prd?.name) {
 lines.push(`\n📋 TRACKER: ${manager.prd.name}`)
 }

 if (manager.prd?.keyFeatures?.length) {
 lines.push(`\nKey Features:`)
 for (const feature of manager.prd.keyFeatures) {
 lines.push(` • ${feature}`)
 }
 }

 // Architectural thinking (if available in thinking field)
 if (manager.thinking) {
 lines.push(`\n🏗️ ARCHITECTURAL THINKING:`)
 lines.push(manager.thinking)
 }

 // BuilderTodo organized by phase
 if (manager.builderTodo?.length) {
 lines.push(`\n📐 ARCHITECTURE BLUEPRINT (${manager.builderTodo.length} tasks):`)

 let currentPhase = ''
 let phaseNumber = 0

 manager.builderTodo.forEach((item, i) => {
 const action = item.action ?? 'create'
 const target = item.target ?? ''
 const task = item.task ?? ''

 // Detect phase changes based on comments or task descriptions
 const phaseMatch = task.match(/PHASE (\d+):\s*([A-Z_\s]+)/i)
 if (phaseMatch) {
 const newPhase = phaseMatch[2].trim()
 if (newPhase !== currentPhase) {
 currentPhase = newPhase
 phaseNumber++
 lines.push(`\n ➤ PHASE ${phaseNumber}: ${currentPhase}`)
 }
 }

 lines.push(` ${i + 1}. [${action}] ${target}: ${task}`)
 })
 }

 lines.push('\n=== End Manager Plan ===')
 return lines.join('\n')
}

function formatResolvedMasterData(entries: ResolvedMasterDataEntry[]): string {
 const lines = ['\n=== Pre-Resolved Master Data ===']
 lines.push('These master data trackers are ALREADY IN THE DATABASE. Use their EXACT IDs in bindings.')
 lines.push('Do NOT use "__master_data__" placeholder. Do NOT create local master data grids. Do NOT output masterDataTrackers.\n')
 for (const e of entries) {
 lines.push(`• key: "${e.key}" name: "${e.name}"`)
 lines.push(` trackerId: "${e.trackerId}" gridId: "${e.gridId}" labelFieldId: "${e.labelFieldId}"`)
 lines.push(` → use binding: { optionsSourceSchemaId: "${e.trackerId}", optionsSourceKey: "${e.key}", optionsGrid: "${e.gridId}", labelField: "${e.gridId}.${e.labelFieldId}" }`)
 }
 lines.push('\n=== End Pre-Resolved Master Data ===\n')
 return lines.join('\n')
}

function formatMasterDataScope(scope?: string | null): string {
 const trimmed = typeof scope === 'string' ? scope.trim() : ''
 if (!trimmed) return ''
 return `Master Data Scope: ${trimmed}\n\n`
}
