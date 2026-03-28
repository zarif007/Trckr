'use client'

import { useMemo } from 'react'
import { resolveFieldRulesV2ForRow } from '@/lib/field-rules-v2/resolve'
import type { FieldRulesV2Map, FieldRulesV2Overrides } from '@/lib/field-rules-v2/types'

/**
 * Resolves Field Rules V2 for a single grid row.
 *
 * Sync triggers are resolved inline (pure function, no state).
 * Async triggers (onExternalBinding, onDependencyResolve) are not yet
 * implemented — they will require a separate effect-based extension.
 */
export function useFieldRulesV2(
  fieldRulesV2: FieldRulesV2Map | undefined,
  gridId: string,
  rowValues: Record<string, unknown>,
  rowIndex: number,
): FieldRulesV2Overrides {
  return useMemo(
    () => resolveFieldRulesV2ForRow(fieldRulesV2, gridId, rowValues, rowIndex),
    // rowValues identity changes per-render in grids; stable via JSON.stringify
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fieldRulesV2, gridId, rowIndex, JSON.stringify(rowValues)],
  )
}
