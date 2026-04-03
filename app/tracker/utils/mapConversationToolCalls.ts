import type { ToolCallEntry } from '@/lib/agent/tool-calls'
import { coerceToolCallPurpose } from '@/lib/agent/tool-calls'

type ToolCallStatus = ToolCallEntry['status']

function coerceStatus(raw: unknown): ToolCallStatus {
 const s = typeof raw === 'string' ? raw.toLowerCase() : ''
 if (s === 'pending' || s === 'running' || s === 'done' || s === 'error') return s
 return 'done'
}

/**
 * Maps tool call rows from GET /api/trackers/.../conversation (or equivalent JSON) to ToolCallEntry.
 */
export function mapApiToolCallsToEntries(
 rows: readonly ToolCallEntry[] | unknown[] | undefined | null,
): ToolCallEntry[] | undefined {
 if (!rows?.length) return undefined
 const out: ToolCallEntry[] = []
 for (const r of rows) {
 if (!r || typeof r !== 'object') continue
 const o = r as Record<string, unknown>
 const id = typeof o.id === 'string' ? o.id : `tc-${out.length}`
 const fieldPath = typeof o.fieldPath === 'string' ? o.fieldPath : ''
 const description = typeof o.description === 'string' ? o.description : ''
 const purpose = coerceToolCallPurpose(o.purpose)
 const status = coerceStatus(o.status)
 const error = o.error != null && typeof o.error === 'string' ? o.error : undefined
 const result = 'result' in o ? o.result : undefined
 out.push({
 id,
 fieldPath,
 purpose,
 description,
 status,
 ...(error != null && { error }),
 ...(result !== undefined && { result }),
 })
 }
 return out.length ? out : undefined
}
