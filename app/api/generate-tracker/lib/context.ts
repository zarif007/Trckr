/**
 * Builds conversation context and current tracker state blocks for the LLM prompt.
 */

import { MAX_CONTEXT_MESSAGES_PER_ROLE } from './constants'

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
  return `Current Tracker State (JSON): ${JSON.stringify(state, null, 2)}\n\n`
}
