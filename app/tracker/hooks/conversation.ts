export interface PersistMessagePayload {
  role: 'USER' | 'ASSISTANT'
  content: string
  trackerSchemaSnapshot?: object
  managerData?: object
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
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Failed to save message')
  }
}
