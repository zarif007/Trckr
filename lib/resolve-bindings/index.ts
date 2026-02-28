/**
 * Binding Resolution Engine
 * 
 * Core library for resolving field bindings at runtime. Provides:
 * - Path parsing and manipulation (grid.field format)
 * - Grid data access with path-based lookups
 * - Option resolution from bindings with O(1) indexed lookups
 * - Binding application when select values change
 * - Debug utilities for troubleshooting binding issues
 * 
 * @module resolve-bindings
 * 
 * Key concepts:
 * - Field Path: "gridId.fieldId" format for addressing fields
 * - Binding Entry: Configuration linking a select field to an options grid
 * - Field Mapping: Rule for auto-populating target fields from option rows
 * 
 * @example
 * ```ts
 * import { parsePath, findOptionRow, applyBindings } from '@/lib/resolve-bindings';
 * 
 * const { gridId, fieldId } = parsePath('form.status');
 * const optionRow = findOptionRow(gridData, binding, selectedValue, 'form.status');
 * const updates = applyBindings(binding, optionRow, 'form.status');
 * ```
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
