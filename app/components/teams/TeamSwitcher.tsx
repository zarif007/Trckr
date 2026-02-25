'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTeamContext } from '@/lib/teams'
import type { Team, TeamWithMembers } from '@/lib/teams/types'

const PERSONAL_ID = '__personal__'

export function TeamSwitcher() {
  const ctx = useTeamContext()
  const [teams, setTeams] = useState<TeamWithMembers[]>([])

  useEffect(() => {
    fetch('/api/teams')
      .then((res) => res.ok ? res.json() : [])
      .then((data: TeamWithMembers[]) => setTeams(data))
      .catch(() => setTeams([]))
  }, [])

  useEffect(() => {
    if (teams.length > 0) ctx?.setTeams(teams)
  }, [teams, ctx])

  const currentTeam = ctx?.currentTeam
  const label = currentTeam ? currentTeam.name : 'Personal'
  const value = currentTeam?.id ?? PERSONAL_ID

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 min-w-[140px] justify-between font-medium"
          aria-label="Switch team or workspace"
          aria-haspopup="listbox"
          aria-expanded={undefined}
        >
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1" role="listbox">
        <button
          type="button"
          role="option"
          aria-selected={value === PERSONAL_ID}
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-muted focus:bg-muted focus:outline-none"
          onClick={() => ctx?.setCurrentTeam(null)}
        >
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>Personal</span>
        </button>
        {teams.map((team: Team) => (
          <button
            key={team.id}
            type="button"
            role="option"
            aria-selected={value === team.id}
            className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-muted focus:bg-muted focus:outline-none"
            onClick={() => ctx?.setCurrentTeam(team)}
          >
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{team.name}</span>
          </button>
        ))}
        {teams.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No teams yet. Create or join a team to see shared trackers.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
