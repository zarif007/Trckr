/**
 * Builds conversation context and current tracker state blocks for the LLM prompt.
 */

import { MAX_CONTEXT_MESSAGES_PER_ROLE } from './constants'

const DEFAULT_OVERVIEW_TAB_ID = 'overview_tab'
const DEFAULT_SHARED_TAB_ID = 'shared_tab'
const DEPENDS_ON_OPTIONS_SECTION_ID = 'depends_on_options_section'
const DEPENDS_ON_RULES_GRID = 'depends_on_rules_grid'
const RULES_GRID_FIELD_IDS = new Set([
  'rule_source',
  'rule_operator',
  'rule_value',
  'rule_action',
  'rule_set',
  'rule_targets',
])

/** Minimal shape for chat messages we read from */
interface ChatMessage {
  role?: string
  content?: string
  managerData?: {
    thinking?: string
    prd?: unknown
    builderTodo?: unknown[]
  }
  trackerData?: Record<string, unknown>
}

/** Normalized tracker state we inject into the prompt */
export interface NormalizedTrackerState {
  tabs: Array<{ id: string; name?: string; placeId?: number; config?: Record<string, unknown> }>
  sections: Array<{ id: string; name?: string; tabId?: string; placeId?: number; config?: Record<string, unknown> }>
  grids: Array<{ id: string; name?: string; sectionId?: string; placeId?: number; config?: Record<string, unknown>; views?: unknown[] }>
  fields: Array<{ id: string; dataType?: string; ui?: unknown; config?: Record<string, unknown> }>
  layoutNodes?: unknown[]
  bindings?: Record<string, unknown>
  validations?: Record<string, unknown>
  dependsOn?: unknown[]
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isEmptyRecord(value: unknown): boolean {
  return !isPlainRecord(value) || Object.keys(value).length === 0
}

function isDefaultTabConfig(value: unknown): boolean {
  if (!isPlainRecord(value)) return true
  for (const [key, v] of Object.entries(value)) {
    if (key !== 'isHidden') return false
    if (v !== false && v !== undefined) return false
  }
  return true
}

function isDependsOnScaffoldSection(section: { id: string; tabId?: string }): boolean {
  return section.id === DEPENDS_ON_OPTIONS_SECTION_ID && section.tabId === DEFAULT_SHARED_TAB_ID
}

function isDependsOnScaffoldGrid(grid: { id: string; sectionId?: string }): boolean {
  return grid.id === DEPENDS_ON_RULES_GRID && grid.sectionId === DEPENDS_ON_OPTIONS_SECTION_ID
}

function isDependsOnScaffoldField(field: { id: string }): boolean {
  return RULES_GRID_FIELD_IDS.has(field.id)
}

function isDependsOnScaffoldLayoutNode(node: { gridId: string; fieldId: string }): boolean {
  return node.gridId === DEPENDS_ON_RULES_GRID && RULES_GRID_FIELD_IDS.has(node.fieldId)
}

/**
 * First-run untouched scaffold:
 * - only default tabs (Overview, optional Shared)
 * - no user-created structural data
 * - ignore internal Depends On scaffold rows/fields if present
 */
function isUntouchedDefaultState(state: NormalizedTrackerState): boolean {
  const meaningfulSections = state.sections.filter((s) => !isDependsOnScaffoldSection(s))
  const meaningfulGrids = state.grids.filter((g) => !isDependsOnScaffoldGrid(g))
  const meaningfulFields = state.fields.filter((f) => !isDependsOnScaffoldField(f))
  const meaningfulLayout = (state.layoutNodes ?? [])
    .filter((n): n is { gridId: string; fieldId: string } => {
      if (!n || typeof n !== 'object') return false
      const o = n as Record<string, unknown>
      return typeof o.gridId === 'string' && typeof o.fieldId === 'string'
    })
    .filter((n) => !isDependsOnScaffoldLayoutNode(n))

  const bindings = state.bindings ?? {}
  const validations = state.validations ?? {}
  const meaningfulBindingKeys = Object.keys(bindings).filter(
    (key) => !key.startsWith(`${DEPENDS_ON_RULES_GRID}.`),
  )
  const meaningfulValidationKeys = Object.keys(validations).filter(
    (key) => !key.startsWith(`${DEPENDS_ON_RULES_GRID}.`),
  )

  if (
    meaningfulSections.length > 0 ||
    meaningfulGrids.length > 0 ||
    meaningfulFields.length > 0 ||
    meaningfulLayout.length > 0 ||
    meaningfulBindingKeys.length > 0 ||
    meaningfulValidationKeys.length > 0
  ) {
    return false
  }

  const dependsOn = Array.isArray(state.dependsOn) ? state.dependsOn : []
  if (dependsOn.length > 0) return false

  if (state.tabs.length === 0 || state.tabs.length > 2) return false

  let sawOverview = false
  for (const tab of state.tabs) {
    if (!tab.id) return false
    if (!isDefaultTabConfig(tab.config)) return false

    if (tab.id === DEFAULT_OVERVIEW_TAB_ID) {
      sawOverview = true
      if ((tab.name ?? 'Overview') !== 'Overview') return false
      continue
    }

    if (tab.id === DEFAULT_SHARED_TAB_ID) {
      if ((tab.name ?? 'Shared') !== 'Shared') return false
      continue
    }

    return false
  }

  return sawOverview
}

function toRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
}

/**
 * Normalize raw tracker payload (from request or assistant message) into a stable shape for the prompt.
 */
export function normalizeTrackerState(source: unknown): NormalizedTrackerState | null {
  if (source == null || typeof source !== 'object' || Array.isArray(source)) return null
  const t = source as Record<string, unknown>
  const tabs = toRecordArray(t.tabs)
  const sections = toRecordArray(t.sections)
  const grids = toRecordArray(t.grids)
  const fields = toRecordArray(t.fields)
  return {
    tabs: tabs.map((tab) => ({
      id: String(tab.id ?? ''),
      name: tab.name as string | undefined,
      placeId: typeof tab.placeId === 'number' ? tab.placeId : undefined,
      config: (tab.config as Record<string, unknown>) ?? {},
    })),
    sections: sections.map((s) => ({
      id: String(s.id ?? ''),
      name: s.name as string | undefined,
      tabId: s.tabId as string | undefined,
      placeId: typeof s.placeId === 'number' ? s.placeId : undefined,
      config: (s.config as Record<string, unknown>) ?? {},
    })),
    grids: grids.map((g) => ({
      id: String(g.id ?? ''),
      name: g.name as string | undefined,
      sectionId: g.sectionId as string | undefined,
      placeId: typeof g.placeId === 'number' ? g.placeId : undefined,
      config: (g.config as Record<string, unknown>) ?? {},
      views: (g.views as unknown[]) ?? [],
    })),
    fields: fields.map((f) => ({
      id: String(f.id ?? ''),
      dataType: f.dataType as string | undefined,
      ui: f.ui,
      config: (f.config as Record<string, unknown>) ?? {},
    })),
    layoutNodes: Array.isArray(t.layoutNodes) ? t.layoutNodes : [],
    bindings: t.bindings && typeof t.bindings === 'object' ? (t.bindings as Record<string, unknown>) : {},
    validations: t.validations && typeof t.validations === 'object' ? (t.validations as Record<string, unknown>) : {},
    dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [],
  }
}

function formatAssistantMessage(msg: ChatMessage): string {
  const parts: string[] = []
  if (msg.managerData) {
    const { thinking, prd, builderTodo } = msg.managerData
    parts.push(`Manager Thinking: ${thinking ?? ''}`)
    parts.push(`PRD: ${JSON.stringify(prd ?? {}, null, 2)}`)
    if (builderTodo && builderTodo.length > 0) {
      parts.push(`Builder Tasks: ${JSON.stringify(builderTodo, null, 2)}`)
    }
  }
  if (msg.trackerData) {
    const state = normalizeTrackerState(msg.trackerData)
    if (state) {
      parts.push(`Current Tracker State (JSON): ${JSON.stringify(state, null, 2)}`)
    }
  }
  if (msg.content) parts.push(String(msg.content))
  return parts.join('\n')
}

/**
 * Build the conversation context string from recent messages (user + assistant pairs).
 */
export function buildConversationContext(messages: unknown[]): string {
  if (!messages.length) return ''
  const typed = messages as ChatMessage[]
  const userMessages = typed.filter((m) => m.role === 'user')
  const assistantMessages = typed.filter((m) => m.role === 'assistant')
  const lastUser = userMessages.slice(-MAX_CONTEXT_MESSAGES_PER_ROLE)
  const lastAssistant = assistantMessages.slice(-MAX_CONTEXT_MESSAGES_PER_ROLE)
  const parts: string[] = []
  for (const msg of lastUser) {
    parts.push(`User: ${msg.content ?? ''}`)
  }
  for (const msg of lastAssistant) {
    const formatted = formatAssistantMessage(msg)
    if (formatted) parts.push(`Assistant:\n${formatted}`)
  }
  return parts.join('\n\n') + (parts.length ? '\n\n' : '')
}

/**
 * Build the "Current Tracker State (JSON)" block for the prompt when the client sends currentTracker.
 */
export function buildCurrentStateBlock(currentTracker: unknown): string {
  const state = normalizeTrackerState(currentTracker)
  if (!state) return ''
  if (isUntouchedDefaultState(state)) return ''
  return `Current Tracker State (JSON): ${JSON.stringify(state, null, 2)}\n\n`
}
