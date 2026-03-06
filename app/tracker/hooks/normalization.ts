import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
import type { TrackerLike } from '@/lib/validate-tracker'

const DEFAULT_OVERVIEW_TAB_ID = 'overview_tab'
const DEFAULT_SHARED_TAB_ID = 'shared_tab'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value)

const isEmptyObject = (value: unknown): boolean =>
  !isPlainObject(value) || Object.keys(value).length === 0

function isDefaultTabConfig(value: unknown): boolean {
  if (!isPlainObject(value)) return true
  for (const [key, v] of Object.entries(value)) {
    if (key !== 'isHidden') return false
    if (v !== false && v !== undefined) return false
  }
  return true
}

export function isUntouchedFirstRunScaffold(tracker: TrackerLike | null | undefined): boolean {
  if (!tracker) return true
  const trackerWithExtras = tracker as TrackerLike & { styles?: unknown; dynamicOptions?: unknown }

  const sections = Array.isArray(tracker.sections) ? tracker.sections : []
  const grids = Array.isArray(tracker.grids) ? tracker.grids : []
  const fields = Array.isArray(tracker.fields) ? tracker.fields : []
  const layoutNodes = Array.isArray(tracker.layoutNodes) ? tracker.layoutNodes : []
  const dependsOn = Array.isArray(tracker.dependsOn) ? tracker.dependsOn : []

  if (sections.length > 0 || grids.length > 0 || fields.length > 0 || layoutNodes.length > 0) {
    return false
  }

  if (
    !isEmptyObject(tracker.bindings) ||
    !isEmptyObject(tracker.validations) ||
    !isEmptyObject((tracker as TrackerLike & { calculations?: unknown }).calculations) ||
    !isEmptyObject(trackerWithExtras.styles) ||
    !isEmptyObject(trackerWithExtras.dynamicOptions)
  ) {
    return false
  }
  if (dependsOn.length > 0) return false

  const tabs = Array.isArray(tracker.tabs) ? tracker.tabs : []
  if (tabs.length === 0 || tabs.length > 2) return false

  let sawOverview = false
  for (const tab of tabs) {
    if (!tab || typeof tab.id !== 'string') return false
    if (!isDefaultTabConfig(tab.config)) return false

    if (tab.id === DEFAULT_OVERVIEW_TAB_ID) {
      sawOverview = true
      if ((tab.name ?? 'Overview') !== 'Overview') return false
      continue
    }

    if (tab.id === DEFAULT_SHARED_TAB_ID) {
      if ((tab.name ?? 'Shared') !== 'Shared') return false
      continue
    }

    return false
  }

  return sawOverview
}

export function trackerHasAnyData(tracker?: TrackerLike | null): boolean {
  if (!tracker) return false
  return Boolean(
    (Array.isArray(tracker.tabs) && tracker.tabs.length > 0) ||
    (Array.isArray(tracker.sections) && tracker.sections.length > 0) ||
    (Array.isArray(tracker.grids) && tracker.grids.length > 0) ||
    (Array.isArray(tracker.fields) && tracker.fields.length > 0),
  )
}

export function normalizeValidationAndCalculations(tracker: TrackerLike): TrackerLike {
  const grids = tracker.grids ?? []
  const fields = tracker.fields ?? []
  const layoutNodes = tracker.layoutNodes ?? []
  const validations = tracker.validations ?? {}
  const calculations = (tracker as TrackerLike & { calculations?: Record<string, Record<string, unknown>> }).calculations ?? {}

  const gridIds = new Set(grids.map((g) => g.id))
  const fieldIds = new Set(fields.map((f) => f.id))
  const gridsByFieldId = new Map<string, Set<string>>()
  for (const n of layoutNodes) {
    if (!gridIds.has(n.gridId) || !fieldIds.has(n.fieldId)) continue
    if (!gridsByFieldId.has(n.fieldId)) gridsByFieldId.set(n.fieldId, new Set())
    gridsByFieldId.get(n.fieldId)?.add(n.gridId)
  }

  const normalized: Record<string, FieldValidationRule[]> = {}
  for (const [key, rules] of Object.entries(validations)) {
    if (!key.includes('.')) {
      const fieldId = key
      if (!fieldIds.has(fieldId)) continue
      const gridSet = gridsByFieldId.get(fieldId)
      if (!gridSet || gridSet.size === 0) continue
      for (const gridId of gridSet) {
        const path = `${gridId}.${fieldId}`
        const existing = normalized[path]
        normalized[path] = existing ? [...existing, ...rules] : rules
      }
      continue
    }

    const [gridId, fieldId] = key.split('.')
    if (!gridId || !fieldId || !gridIds.has(gridId) || !fieldIds.has(fieldId)) continue
    const existing = normalized[key]
    normalized[key] = existing ? [...existing, ...rules] : rules
  }

  const normalizedCalculations: Record<string, FieldCalculationRule> = {}
  for (const [key, rule] of Object.entries(calculations)) {
    if (!key.includes('.')) {
      const fieldId = key
      if (!fieldIds.has(fieldId)) continue
      const gridSet = gridsByFieldId.get(fieldId)
      if (!gridSet || gridSet.size === 0) continue
      for (const gridId of gridSet) {
        normalizedCalculations[`${gridId}.${fieldId}`] = rule as FieldCalculationRule
      }
      continue
    }
    const [gridId, fieldId] = key.split('.')
    if (!gridId || !fieldId || !gridIds.has(gridId) || !fieldIds.has(fieldId)) continue
    normalizedCalculations[key] = rule as FieldCalculationRule
  }

  return { ...tracker, validations: normalized, calculations: normalizedCalculations } as TrackerLike
}
