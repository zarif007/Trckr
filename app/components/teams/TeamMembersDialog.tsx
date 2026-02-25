'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTeamContext, ROLE_LABELS, TEAM_ROLES } from '@/lib/teams'
import type { TeamRole } from '@/lib/teams/types'

interface TeamMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamMembersDialog({ open, onOpenChange }: TeamMembersDialogProps) {
  const ctx = useTeamContext()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor')

  const team = ctx?.currentTeam
  const teamWithMembers = team ? ctx?.teams?.find((t) => t.id === team.id) : null
  const members = teamWithMembers?.members ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {team ? `${team.name} — Members` : 'Team members'}
          </DialogTitle>
        </DialogHeader>
        {team ? (
          <div className="space-y-4">
            <ul className="space-y-2" role="list" aria-label="Team members">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium">
                    {'user' in m && m.user
                      ? (m.user as { name?: string; email: string }).name ?? (m.user as { email: string }).email
                      : m.userId}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {ROLE_LABELS[m.role]}
                    {m.pending ? ' (pending)' : ''}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-sm font-medium">Invite by email</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  aria-label="Invite email"
                  className="flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  aria-label="Role for invite"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TEAM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => {
                    if (inviteEmail.trim()) {
                      setInviteEmail('')
                      onOpenChange(false)
                    }
                  }}
                  aria-label="Send invite"
                >
                  Invite
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a team from the switcher to view and manage members.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
