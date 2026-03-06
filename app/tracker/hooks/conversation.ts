export interface ToolCallPayload {
  purpose: 'validation' | 'calculation'
  fieldPath: string
  description: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
  result?: unknown
}

export interface PersistMessagePayload {
  role: 'USER' | 'ASSISTANT'
  content: string
  trackerSchemaSnapshot?: object
  managerData?: object
  toolCalls?: ToolCallPayload[]
}

export async function ensureConversation(trackerId: string): Promise<string> {
  const res = await fetch(`/api/trackers/${trackerId}/conversation`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Failed to create conversation')
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function persistMessage(
  conversationId: string,
  payload: PersistMessagePayload,
): Promise<void> {
  const body: Record<string, unknown> = {
    role: payload.role,
    content: payload.content,
  }
  if (payload.trackerSchemaSnapshot != null) body.trackerSchemaSnapshot = payload.trackerSchemaSnapshot
  if (payload.managerData != null) body.managerData = payload.managerData
  if (payload.toolCalls?.length) {
    body.toolCalls = payload.toolCalls.map((tc) => ({
      purpose: tc.purpose,
      fieldPath: tc.fieldPath,
      description: tc.description,
      status: tc.status,
      ...(tc.error != null && { error: tc.error }),
      ...(tc.result !== undefined && { result: tc.result }),
    }))
  }

  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Failed to save message')
  }
}
