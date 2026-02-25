/**
 * Shared constants for the teams module.
 * Single source of truth for role labels and role order (used in selects, lists).
 */

import type { TeamRole } from './types'

/** Human-readable labels for each team role. */
export const ROLE_LABELS: Record<TeamRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

/** Role ids in display order (least to most privileged). Use when rendering dropdowns or lists. */
export const TEAM_ROLES: readonly TeamRole[] = ['viewer', 'editor', 'admin'] as const
