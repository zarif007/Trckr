'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTeamContext, ROLE_LABELS, TEAM_ROLES } from '@/lib/teams'
import type { TeamRole } from '@/lib/teams/types'

interface ShareTrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackerName?: string
  /** Callback when user shares with a team (teamId, defaultRole). Backend would persist TrackerMeta. */
  onShare?: (teamId: string, defaultRole: TeamRole) => void
}

export function ShareTrackerDialog({
  open,
  onOpenChange,
  trackerName = 'This tracker',
  onShare,
}: ShareTrackerDialogProps) {
  const ctx = useTeamContext()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [defaultRole, setDefaultRole] = useState<TeamRole>('editor')

  const teams = ctx?.teams ?? []

  const handleShare = () => {
    if (selectedTeamId && onShare) {
      onShare(selectedTeamId, defaultRole)
      onOpenChange(false)
      setSelectedTeamId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Share {trackerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share with a team so members can view or edit based on their role.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="share-team">
              Team
            </label>
            <select
              id="share-team"
              value={selectedTeamId ?? ''}
              onChange={(e) => setSelectedTeamId(e.target.value || null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Select team to share with"
            >
              <option value="">Select a team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="share-role">
              Default role for team
            </label>
            <select
              id="share-role"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as TeamRole)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Default role"
            >
              {TEAM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleShare}
              disabled={!selectedTeamId}
              aria-label="Share with team"
            >
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
