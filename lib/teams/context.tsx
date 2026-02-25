'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Team, TeamWithMembers, User } from './types'

export interface TeamContextValue {
  /** Current user (mock or from auth). */
  currentUser: User | null
  /** Set current user (e.g. after login or for demo). */
  setCurrentUser: (user: User | null) => void
  /** Currently selected team context; null = Personal. */
  currentTeam: Team | null
  setCurrentTeam: (team: Team | null) => void
  /** List of teams the user belongs to (for switcher). */
  teams: TeamWithMembers[]
  setTeams: (teams: TeamWithMembers[]) => void
  /** Resolve role for current user in current team (or for a given teamId). Used for permissions. */
  getRoleForTeam: (teamId: string) => 'admin' | 'editor' | 'viewer' | null
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [teams, setTeams] = useState<TeamWithMembers[]>([])

  const getRoleForTeam = useCallback(
    (teamId: string): 'admin' | 'editor' | 'viewer' | null => {
      if (!currentUser) return null
      const team = teams.find((t) => t.id === teamId)
      const membership = team?.members?.find(
        (m) => m.userId === currentUser.id && !m.pending
      )
      return membership?.role ?? null
    },
    [currentUser, teams]
  )

  const value = useMemo<TeamContextValue>(
    () => ({
      currentUser,
      setCurrentUser,
      currentTeam,
      setCurrentTeam,
      teams,
      setTeams,
      getRoleForTeam,
    }),
    [currentUser, currentTeam, teams, getRoleForTeam]
  )

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  )
}

export function useTeamContext(): TeamContextValue | null {
  return useContext(TeamContext)
}

export function useTeamContextOrThrow(): TeamContextValue {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeamContextOrThrow must be used within TeamProvider')
  return ctx
}
