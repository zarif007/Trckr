const MAX_CONTEXT_MESSAGES = 6

interface ChatMessage {
 role?: string
 content?: string
}

/**
 * Summarise the tracker schema (field structure) for the analyst prompt.
 */
export function buildSchemaContext(trackerSchema: unknown): string {
 if (!trackerSchema || typeof trackerSchema !== 'object') return ''

 const s = trackerSchema as Record<string, unknown>
 const grids = Array.isArray(s.grids) ? s.grids : []
 const fields = Array.isArray(s.fields) ? s.fields : []
 const layoutNodes = Array.isArray(s.layoutNodes) ? s.layoutNodes : []

 const fieldMap = new Map<string, Record<string, unknown>>()
 for (const f of fields) {
 if (f && typeof f === 'object' && 'id' in f) {
 fieldMap.set(String((f as Record<string, unknown>).id), f as Record<string, unknown>)
 }
 }

 const gridFields = new Map<string, string[]>()
 for (const ln of layoutNodes) {
 if (!ln || typeof ln !== 'object') continue
 const node = ln as Record<string, unknown>
 const gridId = String(node.gridId ?? '')
 const fieldId = String(node.fieldId ?? '')
 if (!gridId || !fieldId) continue
 const list = gridFields.get(gridId) ?? []
 list.push(fieldId)
 gridFields.set(gridId, list)
 }

 const parts: string[] = ['## Tracker Structure\n']

 for (const g of grids) {
 if (!g || typeof g !== 'object') continue
 const grid = g as Record<string, unknown>
 const gridId = String(grid.id ?? '')
 const gridName = String(grid.name ?? gridId)
 parts.push(`### Grid: ${gridName}`)

 const fieldIds = gridFields.get(gridId) ?? []
 if (fieldIds.length === 0) {
 parts.push('(no fields)')
 continue
 }

 for (const fId of fieldIds) {
 const field = fieldMap.get(fId)
 if (!field) continue
 const label =
 (field.ui as Record<string, unknown> | undefined)?.label ??
 field.id ??
 fId
 const dataType = field.dataType ?? 'text'
 parts.push(`- **${label}** (${dataType})`)
 }
 parts.push('')
 }

 return parts.join('\n')
}

/**
 * Serialize tracker data rows for the analyst prompt.
 */
export function buildDataContext(trackerData: unknown): string {
 if (!trackerData || typeof trackerData !== 'object') return ''
 const data = trackerData as Record<string, unknown>
 const entries = Object.entries(data).filter(
 ([, rows]) => Array.isArray(rows) && rows.length > 0,
 )
 if (entries.length === 0) return ''

 const parts: string[] = ['## Tracker Data\n']

 for (const [gridId, rows] of entries) {
 const rowArr = rows as Array<Record<string, unknown>>
 parts.push(`### ${gridId} (${rowArr.length} rows)`)
 parts.push('```json')
 parts.push(JSON.stringify(rowArr, null, 2))
 parts.push('```')
 parts.push('')
 }

 return parts.join('\n')
}

/**
 * Build conversation history for the analyst prompt (last N messages).
 */
export function buildConversationContext(messages: unknown[]): string {
 if (!messages.length) return ''
 const typed = messages as ChatMessage[]
 const recent = typed.slice(-MAX_CONTEXT_MESSAGES)
 const parts: string[] = []
 for (const msg of recent) {
 const role = msg.role === 'user' ? 'User' : 'Assistant'
 parts.push(`${role}: ${msg.content ?? ''}`)
 }
 return parts.join('\n\n') + '\n\n'
}
