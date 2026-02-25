/**
 * Types for teams, membership, and tracker ownership.
 * Used by Teams UI and permission derivation (e.g. viewer → read-only).
 * See lib/teams/README.md for module overview and implementation checklist.
 */

/** Role in a team. admin = full control; editor = edit schema + data; viewer = read-only. */
export type TeamRole = 'admin' | 'editor' | 'viewer'

/** User identity (from auth). */
export interface User {
  id: string
  email: string
  name?: string
}

/** Team or workspace. */
export interface Team {
  id: string
  name: string
  slug: string
  /** Optional settings (e.g. default role for new invites). */
  config?: Record<string, unknown>
}

/** User's membership in a team. */
export interface Membership {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  /** True until invite is accepted. */
  pending?: boolean
}

/**
 * Tracker metadata: ownership and sharing. Stored separately from tracker schema.
 * When you add persistence, save this per tracker (e.g. in its own table or document).
 */
export interface TrackerMeta {
  id?: string
  trackerId: string
  /** User who created/owns the tracker (personal). */
  ownerId: string
  /** If set, tracker is shared with this team. */
  teamId?: string
  /** Default role for the team when shared. */
  teamDefaultRole?: TeamRole
}

/** Team plus its members (and optional user details). Returned by list/get team APIs. */
export interface TeamWithMembers extends Team {
  members: Array<Membership & { user?: User }>
}
