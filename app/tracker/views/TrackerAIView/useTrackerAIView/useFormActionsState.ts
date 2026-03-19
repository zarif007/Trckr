'use client'

import { useMemo } from 'react'
import type { TrackerFormAction } from '@/app/components/tracker-display/types'
import { normalizeFormActions } from '../normalize'
import { DRAFT_STATUS_TAG } from '../types'

export function useFormActionsState(
  schema: { formActions?: TrackerFormAction[] | null } | null,
  currentFormStatus: string | null
) {
  const formActions = useMemo(
    () => normalizeFormActions(schema?.formActions),
    [schema]
  )
  const activeFormAction = useMemo(
    () =>
      formActions.find(
        (action) =>
          action.statusTag.trim().toLowerCase() === (currentFormStatus ?? '').trim().toLowerCase()
      ) ?? null,
    [formActions, currentFormStatus]
  )
  const currentStatusNormalized = (currentFormStatus ?? '').trim().toLowerCase()
  const activeActionIndex = useMemo(
    () =>
      formActions.findIndex(
        (action) => action.statusTag.trim().toLowerCase() === currentStatusNormalized
      ),
    [formActions, currentStatusNormalized]
  )
  const nextActionIndex = useMemo(() => {
    if (formActions.length === 0) return -1
    if (activeActionIndex < 0) return 0
    const next = activeActionIndex + 1
    return next < formActions.length ? next : -1
  }, [formActions, activeActionIndex])
  const visibleFormActions = useMemo(
    () => (nextActionIndex >= 0 ? [formActions[nextActionIndex]] : []),
    [formActions, nextActionIndex]
  )
  const effectiveCurrentFormStatus = useMemo(
    () => currentFormStatus?.trim() || DRAFT_STATUS_TAG,
    [currentFormStatus]
  )
  const previousFormStatus = useMemo(() => {
    if (nextActionIndex <= 0) return DRAFT_STATUS_TAG
    return formActions[nextActionIndex - 1]?.statusTag || DRAFT_STATUS_TAG
  }, [formActions, nextActionIndex])
  const isReadOnly = activeFormAction ? !activeFormAction.isEditable : false

  return {
    formActions,
    activeFormAction,
    activeActionIndex,
    nextActionIndex,
    visibleFormActions,
    effectiveCurrentFormStatus,
    previousFormStatus,
    isReadOnly,
  }
}
