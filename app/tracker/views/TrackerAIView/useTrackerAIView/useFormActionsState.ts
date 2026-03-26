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

  const terminalAction = useMemo(
    () => formActions.find((a) => a.isLast === true) ?? null,
    [formActions]
  )

  const currentStatusNormalized = (currentFormStatus ?? '').trim().toLowerCase()
  const formActionsLocked = useMemo(() => {
    if (!terminalAction) return false
    return (
      terminalAction.statusTag.trim().toLowerCase() === currentStatusNormalized
    )
  }, [terminalAction, currentStatusNormalized])

  const effectiveCurrentFormStatus = useMemo(
    () => currentFormStatus?.trim() || DRAFT_STATUS_TAG,
    [currentFormStatus]
  )

  const isReadOnly = activeFormAction ? !activeFormAction.isEditable : false

  return {
    formActions,
    activeFormAction,
    formActionsLocked,
    effectiveCurrentFormStatus,
    isReadOnly,
  }
}
