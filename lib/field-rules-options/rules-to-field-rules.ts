/**
 * Converts Rules grid rows (from gridData) back into FieldRule[].
 * Used so that when the user adds/edits rows in the Rules table, those rows
 * become the effective fieldRules. Rows missing source or targets are skipped.
 */

import type { FieldRule } from '@/lib/field-rules'

const VALID_ACTIONS: FieldRule['action'][] = ['isHidden', 'isRequired', 'isDisabled']

function toValidAction(raw: unknown): FieldRule['action'] {
  return VALID_ACTIONS.includes(raw as FieldRule['action'])
    ? (raw as FieldRule['action'])
    : 'isHidden'
}

export function rulesGridRowsToFieldRules(
  rows: Array<Record<string, unknown>> | undefined
): FieldRule[] {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const result: FieldRule[] = []
  for (const row of rows) {
    const source = row.rule_source
    const targets = row.rule_targets
    if (
      source == null ||
      source === '' ||
      !Array.isArray(targets) ||
      targets.length === 0
    )
      continue

    const setRaw = row.rule_set
    const setValue =
      setRaw === 'true' || setRaw === true
        ? true
        : setRaw === 'false' || setRaw === false
          ? false
          : setRaw

    result.push({
      source: String(source),
      operator: (row.rule_operator as FieldRule['operator']) ?? 'eq',
      value: row.rule_value,
      action: toValidAction(row.rule_action),
      set: setValue,
      targets: targets.map(String),
    })
  }
  return result
}
