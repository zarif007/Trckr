/**
 * Resolve depends-on rules against grid data to produce per-field overrides
 * (isHidden, isRequired, isDisabled, value) for a target grid row.
 */

import type { FieldPath } from '@/lib/types/tracker-bindings'
import { getValueByPath, parsePath } from '@/lib/resolve-bindings'
import type {
  DependsOnRule,
  FieldOverride,
  EnrichedDependsOnRule,
  ParsedPath,
  ResolveDependsOnOptions,
} from './types'
import { compareValues } from './compare'

function normalizeAction(
  action: unknown
): keyof FieldOverride | 'setValue' | null {
  if (!action) return null
  if (
    action === 'isHidden' ||
    action === 'isRequired' ||
    action === 'isDisabled' ||
    action === 'set'
  ) {
    return action === 'set' ? 'setValue' : (action as keyof FieldOverride)
  }
  const normalized = String(action)
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  if (normalized === 'hidden' || normalized === 'ishidden') return 'isHidden'
  if (normalized === 'required' || normalized === 'isrequired')
    return 'isRequired'
  if (normalized === 'disabled' || normalized === 'isdisabled')
    return 'isDisabled'
  if (normalized === 'set') return 'setValue'
  return null
}

export function resolveDependsOnOverrides(
  rules: DependsOnRule[] | undefined,
  gridData: Record<string, Array<Record<string, unknown>>>,
  targetGridId: string,
  rowIndex: number,
  rowDataOverride?: Record<string, unknown>,
  options?: ResolveDependsOnOptions
): Record<string, FieldOverride> {
  if (!rules || rules.length === 0) return {}

  const onlyUseRowDataForSource = options?.onlyUseRowDataForSource === true

  type DecisionValue = { priority: number; order: number; value: boolean | unknown }
  const decisions: Record<
    string,
    Partial<Record<keyof FieldOverride | 'setValue', DecisionValue>>
  > = {}
  const ruleMeta: Record<
    string,
    Record<keyof FieldOverride, { hasShowRule: boolean }>
  > = {}

  rules.forEach((rule, order) => {
    if (!rule?.source || !rule?.targets || rule.targets.length === 0) return

    const enriched = rule as EnrichedDependsOnRule
    const sourceGridId =
      enriched._parsedSource?.gridId ?? parsePath(rule.source as FieldPath).gridId
    const sourceFieldId =
      enriched._parsedSource?.fieldId ??
      parsePath(rule.source as FieldPath).fieldId
    if (!sourceGridId || !sourceFieldId) return

    const sourceRowIndex = sourceGridId === targetGridId ? rowIndex : 0
    const useRowDataOnly =
      sourceGridId === targetGridId &&
      (onlyUseRowDataForSource ||
        (rowDataOverride && sourceFieldId in rowDataOverride))
    const sourceValue = useRowDataOnly
      ? rowDataOverride?.[sourceFieldId]
      : getValueByPath(
        gridData,
        rule.source as FieldPath,
        sourceRowIndex
      )

    const matches = enriched._compare
      ? enriched._compare(sourceValue)
      : compareValues(
        sourceValue,
        rule.operator ?? 'eq',
        rule.value
      )

    const setValue = rule.set ?? true
    const priority = typeof rule.priority === 'number' ? rule.priority : 0

    const targetsToIterate =
      enriched._parsedTargets ??
      rule.targets
        .map((t) => parsePath(t))
        .filter((p): p is ParsedPath => !!p.gridId && !!p.fieldId)
    for (const target of targetsToIterate) {
      const targetId =
        'gridId' in target ? target.gridId : parsePath(target as FieldPath).gridId
      const targetFieldId =
        'fieldId' in target
          ? target.fieldId
          : parsePath(target as FieldPath).fieldId
      if (!targetId || !targetFieldId) continue
      if (targetId !== targetGridId) continue

      const action = normalizeAction(rule.action)
      if (!action) continue

      if (action !== 'setValue') {
        ruleMeta[targetFieldId] = ruleMeta[targetFieldId] ?? {}
        ruleMeta[targetFieldId][action] = ruleMeta[targetFieldId][action] ?? {
          hasShowRule: false,
        }
        if (action === 'isHidden' && setValue === false) {
          ruleMeta[targetFieldId][action].hasShowRule = true
        }
      }

      if (!matches) continue

      decisions[targetFieldId] = decisions[targetFieldId] ?? {}
      if (action === 'setValue') {
        const existing = decisions[targetFieldId].setValue
        const valueToSet = rule.set
        if (
          !existing ||
          priority > existing.priority ||
          (priority === existing.priority && order > existing.order)
        ) {
          decisions[targetFieldId].setValue = {
            priority,
            order,
            value: valueToSet,
          }
        }
      } else {
        const existing = decisions[targetFieldId][action]
        if (
          !existing ||
          priority > existing.priority ||
          (priority === existing.priority && order > existing.order)
        ) {
          decisions[targetFieldId][action] = {
            priority,
            order,
            value: !!setValue,
          }
        }
      }
    }
  })

  for (const [fieldId, actions] of Object.entries(ruleMeta)) {
    for (const [action, meta] of Object.entries(actions) as Array<
      [keyof FieldOverride, { hasShowRule: boolean }]
    >) {
      if (action !== 'isHidden') continue
      if (!meta?.hasShowRule) continue
      const existing = decisions[fieldId]?.[action]
      if (!existing) {
        decisions[fieldId] = decisions[fieldId] ?? {}
        decisions[fieldId][action] = {
          priority: -Infinity,
          order: -Infinity,
          value: true,
        }
      }
    }
  }

  const overrides: Record<string, FieldOverride> = {}
  Object.entries(decisions).forEach(([fieldId, actions]) => {
    const setVal = (actions as { setValue?: DecisionValue }).setValue?.value
    const out: FieldOverride = {
      isHidden: (actions.isHidden?.value as boolean | undefined) ?? undefined,
      isRequired:
        (actions.isRequired?.value as boolean | undefined) ?? undefined,
      isDisabled:
        (actions.isDisabled?.value as boolean | undefined) ?? undefined,
    }
    if (setVal !== undefined) out.value = setVal
    overrides[fieldId] = out
  })

  return overrides
}
