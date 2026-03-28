/**
 * Merge field-rule overrides onto base config.
 */

import type { FieldOverride } from './types'

/** Applies field rule overrides over base config. Override values take priority when defined. */
export function applyFieldOverrides<T extends Record<string, unknown>>(
  base: T | null | undefined,
  override?: FieldOverride
): T {
  const b = (base ?? {}) as T & FieldOverride
  const o = override
  const next = { ...b } as T & FieldOverride
  if (!o) return next as T
  next.isHidden = o.isHidden !== undefined ? o.isHidden : b.isHidden
  next.isRequired = o.isRequired !== undefined ? o.isRequired : b.isRequired
  next.isDisabled = o.isDisabled !== undefined ? o.isDisabled : b.isDisabled
  if (o.value !== undefined) next.value = o.value
  if (o.label !== undefined) next.label = o.label
  if (o.options !== undefined) next.options = o.options
  return next as T
}
