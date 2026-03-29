/**
 * Merge field-rule overrides onto a field config.
 *
 * FieldRuleOverride uses visibility/required/disabled naming.
 * Field configs use isHidden/isRequired/isDisabled (persisted schema shape — unchanged).
 * This function bridges between the two: visibility:false → isHidden:true, etc.
 */

import type { FieldRuleOverride } from './types'

export function applyFieldOverrides<T extends Record<string, unknown>>(
  base: T | null | undefined,
  override?: FieldRuleOverride
): T {
  const next: Record<string, unknown> = { ...(base ?? {}) }
  if (!override) return next as T

  // visibility (true = shown) maps to isHidden (true = hidden) — inverted
  if (override.visibility !== undefined) next['isHidden'] = !override.visibility
  if (override.required !== undefined) next['isRequired'] = override.required
  if (override.disabled !== undefined) next['isDisabled'] = override.disabled
  if (override.value !== undefined) next['value'] = override.value
  if (override.label !== undefined) next['label'] = override.label
  return next as T
}
