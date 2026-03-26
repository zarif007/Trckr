import { DEFAULT_FORM_ACTION } from '@/app/components/tracker-display/tracker-editor'
import type { TrackerFormAction } from '@/app/components/tracker-display/types'
import type { TrackerResponse } from '../../hooks/useTrackerChat'

export function normalizeFormActions(
  actions: TrackerFormAction[] | null | undefined
): TrackerFormAction[] {
  const list = Array.isArray(actions) ? actions : []
  const trimmed = list.map((action, index) => {
    const label = typeof action?.label === 'string' ? action.label.trim() : ''
    const statusTag = typeof action?.statusTag === 'string' ? action.statusTag.trim() : ''
    return {
      id:
        typeof action?.id === 'string' && action.id.trim().length > 0
          ? action.id
          : `form_action_${index}`,
      label,
      statusTag,
      isEditable: action?.isEditable === true,
      persistOnly: action?.persistOnly === true,
      isLast: action?.isLast === true,
    }
  })
  const firstFromInput = trimmed[0]
  const first: TrackerFormAction = {
    id: firstFromInput?.id || DEFAULT_FORM_ACTION.id,
    label: firstFromInput?.label || DEFAULT_FORM_ACTION.label,
    statusTag: firstFromInput?.statusTag || DEFAULT_FORM_ACTION.statusTag,
    isEditable: true,
    persistOnly: false,
    isLast: false,
  }
  const restFiltered = trimmed
    .slice(1)
    .filter((action) => action.label.length > 0 && action.statusTag.length > 0)
  let lastIsLastIndex = -1
  for (let i = restFiltered.length - 1; i >= 0; i--) {
    if (restFiltered[i].isLast) {
      lastIsLastIndex = i
      break
    }
  }
  const rest: TrackerFormAction[] = restFiltered.map((action, i) => ({
    ...action,
    isLast: i === lastIsLastIndex,
  }))
  return [first, ...rest]
}

export function normalizeTrackerSchema(next: TrackerResponse): TrackerResponse {
  return {
    ...next,
    formActions: normalizeFormActions(next.formActions),
  }
}
