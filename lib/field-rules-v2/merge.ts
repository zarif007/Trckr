// lib/field-rules-v2/merge.ts

import type { FieldOverride } from '@/lib/field-rules/types'
import type { FieldRulesV2PropertyOverride } from './types'

/**
 * Merges V1 FieldOverride with V2 property override into a single FieldOverride.
 * V2 values win on conflict. Neither argument is mutated.
 */
export function mergeV1V2Overrides(
  v1: FieldOverride | undefined,
  v2: FieldRulesV2PropertyOverride | undefined,
): FieldOverride {
  if (!v1 && !v2) return {}

  const merged: FieldOverride = { ...v1 }

  if (!v2) return merged

  // visibility: true = shown (isHidden = false), false = hidden (isHidden = true)
  if (v2.visibility !== undefined) {
    merged.isHidden = !v2.visibility
  }
  if (v2.required !== undefined) {
    merged.isRequired = v2.required
  }
  if (v2.disabled !== undefined) {
    merged.isDisabled = v2.disabled
  }
  if (v2.label !== undefined) {
    merged.label = v2.label
  }
  if (v2.options !== undefined) {
    merged.options = v2.options
  }

  return merged
}
