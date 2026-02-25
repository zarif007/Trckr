/**
 * Derive effective grid add/edit/delete/layout flags from team role and grid config.
 * Viewer forces read-only; editor/admin respect grid config (isRowAddAble, etc.).
 */

import type { TeamRole } from './types'
import type { TrackerGridConfig } from '@/app/components/tracker-display/types'

export interface EffectiveGridPermissions {
  addable: boolean
  editable: boolean
  deletable: boolean
  editLayoutAble: boolean
}

/**
 * Compute effective permissions for a grid view from current user role and grid config.
 * - viewer: all false (read-only).
 * - editor / admin: use grid config; default true for add/edit/delete/layout when not set.
 */
export function getEffectiveGridPermissions(
  role: TeamRole | null | undefined,
  config: TrackerGridConfig | undefined
): EffectiveGridPermissions {
  if (role === 'viewer') {
    return {
      addable: false,
      editable: false,
      deletable: false,
      editLayoutAble: false,
    }
  }
  const c = config ?? {}
  return {
    addable: (c.isRowAddAble ?? c.addable ?? true) !== false,
    editable: c.isRowEditAble !== false,
    deletable: (c.isRowDeletable ?? c.isRowDeleteAble) !== false,
    editLayoutAble: c.isEditAble !== false,
  }
}
