/**
 * Binding resolution engine: path parsing, grid data access, option resolution,
 * and applying bindings when a select option is chosen.
 *
 * Import from @/lib/resolve-bindings.
 */

export type { ParsedPath } from './types'
export type { GridData } from './grid-data'
export type { BindingUpdate } from './apply'
export type { ResolvedOption } from './options'
export type { NewOptionRowResult } from './option-row'

export { enableBindingDebug, disableBindingDebug } from './debug'
export { parsePath, buildFieldPath, normalizeOptionsGridId } from './path'
export { getValueByPath, setValueByPath } from './grid-data'
export { getValueFieldIdFromBinding } from './value-field'
export { applyBindings } from './apply'
export { findOptionRow, resolveOptionsFromBinding, getFullOptionRows } from './options'
export { buildNewOptionRow } from './option-row'
export { getBindingForField, hasBinding } from './lookup'
export { getInitialGridDataFromBindings } from './initial'
