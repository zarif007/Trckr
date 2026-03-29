'use client'

import { useMemo } from 'react'
import { resolveFieldRulesForRow } from '@/lib/field-rules'
import type { FieldRulesMap, FieldRulesResult } from '@/lib/field-rules'

/**
 * Resolves field rules for a single grid row.
 *
 * Sync triggers are resolved inline (pure, no state).
 * Async triggers (onExternalBinding, onDependencyResolve) are not yet
 * implemented — they require a separate effect-based extension.
 */
export function useFieldRules(
  fieldRules: FieldRulesMap | undefined,
  gridId: string,
  rowValues: Record<string, unknown>,
  rowIndex: number,
): FieldRulesResult {
  return useMemo(
    () => resolveFieldRulesForRow(fieldRules, gridId, rowValues, rowIndex),
    // rowValues identity changes per-render; stable via JSON.stringify
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fieldRules, gridId, rowIndex, JSON.stringify(rowValues)],
  )
}

/** @deprecated Use useFieldRules */
export const useFieldRulesV2 = useFieldRules
