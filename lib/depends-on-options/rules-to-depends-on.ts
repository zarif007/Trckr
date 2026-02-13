/**
 * Converts Rules grid rows (from gridData) back into DependsOnRule[].
 * Used so that when the user adds/edits rows in the Rules table, those rows
 * become the effective dependsOn. Rows missing source or targets are skipped.
 */

import type { DependsOnRule } from '@/lib/depends-on'

export function rulesGridRowsToDependsOn(
  rows: Array<Record<string, unknown>> | undefined
): DependsOnRule[] {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const result: DependsOnRule[] = []
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
      operator: (row.rule_operator as DependsOnRule['operator']) ?? 'eq',
      value: row.rule_value,
      action: (row.rule_action as DependsOnRule['action']) ?? 'isHidden',
      set: setValue,
      targets: targets.map(String),
    })
  }
  return result
}
