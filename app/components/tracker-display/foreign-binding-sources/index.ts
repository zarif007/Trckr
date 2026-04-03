/**
 * Foreign binding sources: trackers referenced by `optionsSourceSchemaId` on bindings.
 *
 * - **types** — snapshot shapes and persist metadata
 * - **tracker-api** — load/persist helpers (pure async, easy to unit test)
 * - **useForeignBindingSources** — React state, refs, and queued saves for the inline tracker UI
 */

export type {
 ForeignDataPersistMeta,
 ForeignSourceBundle,
 GridDataSnapshot,
} from './types'
export {
 fetchLatestDataRow,
 loadForeignBindingSource,
 parseSchemaSliceFromTrackerJson,
 persistForeignBindingSnapshot,
} from './tracker-api'
export type { LatestDataRow, PersistForeignBindingResult } from './tracker-api'
export { FOREIGN_BINDING_SAVE_DEBOUNCE_MS } from './constants'
export {
 useForeignBindingSources,
 type ForeignBindingSourcesForOptionsContext,
 type ForeignPersistError,
} from './useForeignBindingSources'
