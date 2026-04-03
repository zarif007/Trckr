/**
 * Typed NDJSON event protocol for the multi-agent build-tracker stream.
 *
 * The backend writes one JSON object per line; the frontend reads and routes events
 * by their `t` discriminator. This module is the single source of truth for the wire format.
 *
 * Event flow:
 *   phase(manager) → manager_partial* → manager_complete
 *   → phase(master-data) → master_data_progress* (only when module/project scope needs resolution)
 *   → phase(builder) → builder_partial* → builder_finish
 */

import type { ManagerSchema } from '@/lib/schemas/multi-agent'
import type { BuilderOutput } from './builder-schema'
import type { ToolCallEntry } from '@/lib/agent/tool-calls'

export type AgentPhase = 'manager' | 'master-data' | 'builder'

export type AgentStreamEvent =
  | { t: 'phase'; phase: AgentPhase }
  /** Streaming chunk from the manager — lets the frontend show thinking/plan as it arrives. */
  | { t: 'manager_partial'; partial: Partial<ManagerSchema> }
  | { t: 'manager_complete'; manager: ManagerSchema }
  /** Progress during master data pre-resolution — emitted once all entities are resolved. */
  | { t: 'master_data_progress'; resolved: number; total: number; name: string }
  | { t: 'builder_partial'; partial: Partial<BuilderOutput> }
  | { t: 'builder_finish'; output: BuilderOutput; toolCalls?: ToolCallEntry[] }
  | { t: 'error'; message: string }

/**
 * Encode an event as a single NDJSON line (JSON + newline).
 */
export function encodeEvent(event: AgentStreamEvent): string {
  return JSON.stringify(event) + '\n'
}

/**
 * Parse a single NDJSON line into a typed event. Returns null on malformed input.
 */
export function decodeEvent(line: string): AgentStreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const obj = parsed as Record<string, unknown>
    if (typeof obj.t !== 'string') return null
    return obj as unknown as AgentStreamEvent
  } catch {
    return null
  }
}
