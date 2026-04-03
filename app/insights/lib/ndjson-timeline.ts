/**
 * Shared NDJSON phase timeline for report and analysis generation streams.
 * See `lib/insights/README.md`.
 */

/** Subset of stream events that drive the collapsible phase timeline UI. */
export type PhaseStreamEventSubset =
 | { t: 'phase_start'; phase: string; label: string }
 | { t: 'phase_delta'; phase: string; text: string }
 | { t: 'phase_end'; phase: string; summary?: string }
 | { t: 'artifact'; phase: string; kind: string; data?: unknown }
 | { t: 'data_preview'; rowCount: number; columns: string[] }

export type GenerationTimelineStep = {
 phase: string
 label?: string
 deltas: string[]
 summary?: string
 /** Last artifact kind recorded for this phase (for label lookup). */
 artifactKind?: string
 rowCount?: number
 columns?: string[]
}

function lastIdxForPhase(steps: GenerationTimelineStep[], phase: string): number {
 for (let j = steps.length - 1; j >= 0; j--) {
 if (steps[j]!.phase === phase) return j
 }
 return -1
}

export function toPhaseStreamEvent(obj: unknown): PhaseStreamEventSubset | null {
 if (!obj || typeof obj !== 'object' || !('t' in obj)) return null
 const t = (obj as { t: string }).t
 switch (t) {
 case 'phase_start': {
 const o = obj as { phase?: string; label?: string }
 if (typeof o.phase !== 'string' || typeof o.label !== 'string') return null
 return { t: 'phase_start', phase: o.phase, label: o.label }
 }
 case 'phase_delta': {
 const o = obj as { phase?: string; text?: string }
 if (typeof o.phase !== 'string' || typeof o.text !== 'string') return null
 return { t: 'phase_delta', phase: o.phase, text: o.text }
 }
 case 'phase_end': {
 const o = obj as { phase?: string; summary?: string }
 if (typeof o.phase !== 'string') return null
 return { t: 'phase_end', phase: o.phase, summary: o.summary }
 }
 case 'artifact': {
 const o = obj as { phase?: string; kind?: string }
 if (typeof o.phase !== 'string' || typeof o.kind !== 'string') return null
 return { t: 'artifact', phase: o.phase, kind: o.kind, data: (o as { data?: unknown }).data }
 }
 case 'data_preview': {
 const o = obj as { rowCount?: unknown; columns?: unknown }
 if (typeof o.rowCount !== 'number' || !Array.isArray(o.columns)) return null
 const columns = o.columns.filter((c): c is string => typeof c === 'string')
 return { t: 'data_preview', rowCount: o.rowCount, columns }
 }
 default:
 return null
 }
}

/**
 * Merge one NDJSON stream event into the collapsible phase timeline state (report and analysis UIs).
 * See `lib/insights/README.md`.
 */
export function applyPhaseStreamEvent(
 steps: GenerationTimelineStep[],
 ev: PhaseStreamEventSubset,
): GenerationTimelineStep[] {
 const next = [...steps]

 switch (ev.t) {
 case 'phase_start':
 next.push({ phase: ev.phase, label: ev.label, deltas: [] })
 break
 case 'phase_delta': {
 const i = lastIdxForPhase(next, ev.phase)
 if (i >= 0) {
 const s = next[i]!
 next[i] = { ...s, deltas: [...s.deltas, ev.text] }
 }
 break
 }
 case 'phase_end': {
 const i = lastIdxForPhase(next, ev.phase)
 if (i >= 0) {
 const s = next[i]!
 next[i] = { ...s, summary: ev.summary }
 }
 break
 }
 case 'artifact': {
 const i = lastIdxForPhase(next, ev.phase)
 if (i >= 0) {
 const s = next[i]!
 next[i] = { ...s, artifactKind: ev.kind }
 }
 break
 }
 case 'data_preview': {
 const i = next.length - 1
 if (i >= 0) {
 const s = next[i]!
 next[i] = { ...s, rowCount: ev.rowCount, columns: ev.columns }
 }
 break
 }
 default:
 break
 }
 return next
}

/**
 * Read an NDJSON body from a `fetch` response: emits phase events, a single final payload, or stream errors.
 * See `lib/insights/README.md`.
 */
export async function consumeInsightNdjsonStream(params: {
 body: ReadableStream<Uint8Array>
 onPhaseEvent: (ev: PhaseStreamEventSubset) => void
 onFinal: (payload: unknown) => void
 onStreamError: (message: string) => void
}): Promise<void> {
 const reader = params.body.getReader()
 const decoder = new TextDecoder()
 let buffer = ''
 try {
 while (true) {
 const { done, value } = await reader.read()
 if (done) break
 buffer += decoder.decode(value, { stream: true })
 const lines = buffer.split('\n')
 buffer = lines.pop() ?? ''
 for (const line of lines) {
 if (!line.trim()) continue
 let obj: unknown
 try {
 obj = JSON.parse(line) as unknown
 } catch {
 continue
 }
 if (!obj || typeof obj !== 'object' || !('t' in obj)) continue
 const t = (obj as { t: string }).t
 if (t === 'final') {
 params.onFinal(obj)
 continue
 }
 if (t === 'error') {
 const msg = (obj as { message?: string }).message
 params.onStreamError(typeof msg === 'string' ? msg : 'Stream error')
 continue
 }
 const pe = toPhaseStreamEvent(obj)
 if (pe) params.onPhaseEvent(pe)
 }
 }
 } finally {
 reader.releaseLock()
 }
}
