export const TOOL_CALL_PURPOSES = [
  'validation',
  'calculation',
  'field-rule',
  'binding',
  'master-data-lookup',
  'master-data-create',
] as const

export type ToolCallPurpose = (typeof TOOL_CALL_PURPOSES)[number]

export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error'

export interface ToolCallEntry {
  id: string
  /** Optional: some tool calls (e.g., master data create/lookup) do not map to a field path. */
  fieldPath?: string
  purpose: ToolCallPurpose
  description: string
  status: ToolCallStatus
  error?: string
  /** Tool result payload when status is done. */
  result?: unknown
}

export function coerceToolCallPurpose(raw: unknown): ToolCallPurpose {
  if (typeof raw !== 'string') return 'calculation'
  const value = raw.trim().toLowerCase()
  const matches = TOOL_CALL_PURPOSES.find((p) => p === value)
  return matches ?? 'calculation'
}
