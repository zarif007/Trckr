/**
 * HTTP + JSON parsing for “foreign” trackers referenced by bindings (optionsSourceSchemaId).
 * Keeps fetch URLs and response shapes in one place for contributors.
 */

import type { ForeignBindingSourceSchema } from '@/lib/dynamic-options'
import type { ForeignDataPersistMeta, ForeignSourceBundle, GridDataSnapshot } from './types'

const trackerUrl = (schemaId: string) => `/api/trackers/${encodeURIComponent(schemaId)}`
const trackerDataListUrl = (schemaId: string) =>
 `/api/trackers/${encodeURIComponent(schemaId)}/data?limit=1`
/** POST/PATCH target (no query string). */
const trackerDataWriteUrl = (schemaId: string) =>
 `/api/trackers/${encodeURIComponent(schemaId)}/data`
const trackerDataItemUrl = (schemaId: string, dataId: string) =>
 `/api/trackers/${encodeURIComponent(schemaId)}/data/${encodeURIComponent(dataId)}`

type DataListPayload = {
 items?: Array<{
 id?: string
 data?: GridDataSnapshot | null
 formStatus?: string | null
 }>
}

function parseDataListPayload(json: unknown): DataListPayload {
 return json && typeof json === 'object' ? (json as DataListPayload) : {}
}

/** Extract grids / fields / layoutNodes from GET /api/trackers/:id JSON. */
export function parseSchemaSliceFromTrackerJson(tracker: unknown): ForeignBindingSourceSchema | null {
 if (!tracker || typeof tracker !== 'object') return null
 const schema = (tracker as { schema?: unknown }).schema
 if (!schema || typeof schema !== 'object' || schema === null) return null
 const s = schema as {
 grids?: ForeignBindingSourceSchema['grids']
 fields?: ForeignBindingSourceSchema['fields']
 layoutNodes?: ForeignBindingSourceSchema['layoutNodes']
 }
 return {
 grids: Array.isArray(s.grids) ? s.grids : [],
 fields: Array.isArray(s.fields) ? s.fields : [],
 layoutNodes: Array.isArray(s.layoutNodes) ? s.layoutNodes : [],
 }
}

function resolveWriteMode(tracker: unknown): ForeignDataPersistMeta['writeMode'] {
 if (!tracker || typeof tracker !== 'object') return 'patch'
 const t = tracker as { instance?: string; versionControl?: boolean }
 const single = t.instance === 'SINGLE' && !t.versionControl
 return single ? 'upsert_post' : 'patch'
}

export type LatestDataRow = {
 gridData: GridDataSnapshot
 dataSnapshotId: string | null
 formStatus: string | null | undefined
}

/**
 * Reads the newest TrackerData row for a tracker (same listing the binding UI uses for options).
 */
export async function fetchLatestDataRow(schemaId: string): Promise<LatestDataRow | null> {
 const res = await fetch(trackerDataListUrl(schemaId))
 if (!res.ok) return null
 const payload = parseDataListPayload(await res.json())
 const item = payload.items?.[0]
 const gridData: GridDataSnapshot =
 item?.data && typeof item.data === 'object' ? item.data : {}
 return {
 gridData,
 dataSnapshotId: typeof item?.id === 'string' ? item.id : null,
 formStatus: item?.formStatus,
 }
}

/**
 * Parallel load of schema + latest data for one foreign binding source.
 * Returns `null` only when the request pair throws (network / parse crash).
 */
export async function loadForeignBindingSource(schemaId: string): Promise<ForeignSourceBundle | null> {
 try {
 const [dataRes, schemaRes] = await Promise.all([
 fetch(trackerDataListUrl(schemaId)),
 fetch(trackerUrl(schemaId)),
 ])

 let gridData: GridDataSnapshot = {}
 let dataSnapshotId: string | null = null
 let formStatus: string | null | undefined
 let dataHydrated = false

 if (dataRes.ok) {
 const payload = parseDataListPayload(await dataRes.json())
 const item = payload.items?.[0]
 dataHydrated = true
 if (item?.data && typeof item.data === 'object') {
 gridData = item.data
 }
 dataSnapshotId = typeof item?.id === 'string' ? item.id : null
 formStatus = item?.formStatus
 }

 let schemaSlice: ForeignBindingSourceSchema | null = null
 let writeMode: ForeignDataPersistMeta['writeMode'] = 'patch'
 if (schemaRes.ok) {
 const tracker = await schemaRes.json()
 schemaSlice = parseSchemaSliceFromTrackerJson(tracker)
 writeMode = resolveWriteMode(tracker)
 }

 const persist: ForeignDataPersistMeta = {
 writeMode,
 dataSnapshotId,
 formStatus,
 hydrated: dataHydrated && schemaRes.ok,
 }

 return { gridData, schemaSlice, persist }
 } catch {
 return null
 }
}

async function readErrorMessage(res: Response): Promise<string> {
 const j = await res.json().catch(() => ({}))
 return typeof j?.error === 'string' ? j.error : `Request failed (${res.status})`
}

export type PersistForeignBindingResult =
 | {
 kind: 'saved'
 serverData?: GridDataSnapshot
 newSnapshotId?: string
 /** After creating the first row, subsequent saves should PATCH. */
 nextWriteMode?: ForeignDataPersistMeta['writeMode']
 }
 | { kind: 'failed'; message: string }

/**
 * Writes a full grid snapshot to the foreign tracker’s TrackerData using the same rules as auto-save.
 */
export async function persistForeignBindingSnapshot(options: {
 sourceSchemaId: string
 meta: ForeignDataPersistMeta
 snapshot: GridDataSnapshot
}): Promise<PersistForeignBindingResult> {
 const { sourceSchemaId, meta, snapshot } = options
 const body: Record<string, unknown> = { data: snapshot }
 if (meta.formStatus !== undefined) {
 body.formStatus = meta.formStatus
 }

 try {
 if (meta.writeMode === 'upsert_post') {
 const res = await fetch(trackerDataWriteUrl(sourceSchemaId), {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body),
 })
 if (!res.ok) {
 return { kind: 'failed', message: await readErrorMessage(res) }
 }
 const saved = (await res.json()) as { data?: GridDataSnapshot }
 return {
 kind: 'saved',
 serverData:
 saved?.data && typeof saved.data === 'object' ? saved.data : undefined,
 }
 }

 if (meta.dataSnapshotId) {
 const res = await fetch(trackerDataItemUrl(sourceSchemaId, meta.dataSnapshotId), {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body),
 })
 if (!res.ok) {
 return { kind: 'failed', message: await readErrorMessage(res) }
 }
 const saved = (await res.json()) as { data?: GridDataSnapshot }
 return {
 kind: 'saved',
 serverData:
 saved?.data && typeof saved.data === 'object' ? saved.data : undefined,
 }
 }

 const res = await fetch(trackerDataWriteUrl(sourceSchemaId), {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body),
 })
 if (!res.ok) {
 return { kind: 'failed', message: await readErrorMessage(res) }
 }
 const saved = (await res.json()) as { id?: string; data?: GridDataSnapshot }
 return {
 kind: 'saved',
 serverData: saved?.data && typeof saved.data === 'object' ? saved.data : undefined,
 newSnapshotId: typeof saved?.id === 'string' ? saved.id : undefined,
 nextWriteMode: 'patch',
 }
 } catch (e) {
 const message = e instanceof Error ? e.message : 'Network error'
 return { kind: 'failed', message }
 }
}
