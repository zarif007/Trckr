'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  GitBranch,
  GitMerge,
  Plus,
  Check,
  Loader2,
  ChevronDown,
  Diff,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { TrackerDiffView } from './TrackerDiffView'
import type { BranchInfo, GridDataSnapshot } from './TrackerDiffView'

export type { BranchInfo, GridDataSnapshot }

/** BranchInfo extended with merge state (from API responses) */
export interface BranchRecord extends BranchInfo {
  isMerged?: boolean
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface TrackerBranchPanelProps {
  trackerId: string
  currentBranch: BranchRecord | null
  branches: BranchRecord[]
  onBranchSwitch: (branch: BranchRecord) => void
  onBranchCreated: (branch: BranchRecord) => void
  onMergedToMain: (updatedMain: BranchRecord) => void
  /** Returns current live grid data (for diffing against main) */
  getCurrentData: () => GridDataSnapshot
  disabled?: boolean
}

export function TrackerBranchPanel({
  trackerId,
  currentBranch,
  branches,
  onBranchSwitch,
  onBranchCreated,
  onMergedToMain,
  getCurrentData,
  disabled,
}: TrackerBranchPanelProps) {
  const [branchSelectorOpen, setBranchSelectorOpen] = useState(false)
  const [newBranchMode, setNewBranchMode] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [merging, setMerging] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const newBranchInputRef = useRef<HTMLInputElement>(null)

  const isOnMain = currentBranch?.branchName === 'main'
  const mainBranch = branches.find((b) => b.branchName === 'main' && !b.isMerged)
  const activeBranches = branches.filter((b) => !b.isMerged)

  useEffect(() => {
    if (newBranchMode) {
      setTimeout(() => newBranchInputRef.current?.focus(), 50)
    }
  }, [newBranchMode])

  const handleCreateBranch = useCallback(async () => {
    const name = newBranchName.trim()
    if (!name) return
    if (!currentBranch) return

    setCreatingBranch(true)
    setError(null)

    try {
      const res = await fetch(`/api/trackers/${trackerId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName: name, basedOnId: currentBranch.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to create branch')
      }

      const newBranch = (await res.json()) as BranchRecord
      onBranchCreated(newBranch)
      setNewBranchName('')
      setNewBranchMode(false)
      setBranchSelectorOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch')
    } finally {
      setCreatingBranch(false)
    }
  }, [newBranchName, currentBranch, trackerId, onBranchCreated])

  const handleMergeToMain = useCallback(async () => {
    if (!currentBranch || isOnMain) return
    if (!window.confirm(`Merge "${currentBranch.branchName}" into main? This will update main's data with your branch changes.`)) return

    setMerging(true)
    setError(null)

    try {
      const res = await fetch(`/api/trackers/${trackerId}/branches/${currentBranch.id}/merge`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to merge')
      }

      const result = await res.json()
      onMergedToMain(result.main as BranchRecord)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge')
    } finally {
      setMerging(false)
    }
  }, [currentBranch, isOnMain, trackerId, onMergedToMain])

  const diffData = useMemo<{ main: BranchInfo; current: BranchInfo } | null>(() => {
    if (!mainBranch || !currentBranch) return null
    if (isOnMain) return null
    return {
      main: mainBranch,
      current: { ...currentBranch, data: getCurrentData() },
    }
  }, [mainBranch, currentBranch, isOnMain, getCurrentData])

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
      {/* Branch selector */}
      <Popover open={branchSelectorOpen} onOpenChange={setBranchSelectorOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors',
              'border-border/60 bg-background hover:bg-muted/50 text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isOnMain && 'text-primary border-primary/30 bg-primary/5',
            )}
          >
            <GitBranch className="h-3 w-3 flex-shrink-0" />
            <span className="max-w-[120px] truncate">
              {currentBranch?.branchName ?? 'No branch'}
            </span>
            <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0" align="start">
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b border-border/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Branches
            </div>

            <div className="max-h-48 overflow-y-auto py-1">
              {activeBranches.map((branch) => {
                const isActive = branch.id === currentBranch?.id
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      onBranchSwitch(branch)
                      setBranchSelectorOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors',
                      isActive && 'bg-primary/5 text-primary',
                    )}
                  >
                    <GitBranch className={cn(
                      'h-3 w-3 flex-shrink-0',
                      branch.branchName === 'main' ? 'text-primary' : 'text-muted-foreground',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{branch.branchName}</div>
                      {branch.author?.name && (
                        <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                          <User className="h-2.5 w-2.5" />
                          {branch.author.name} · {formatRelative(branch.updatedAt)}
                        </div>
                      )}
                    </div>
                    {isActive && <Check className="h-3 w-3 flex-shrink-0 text-primary" />}
                  </button>
                )
              })}
              {activeBranches.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No branches yet. Save data first, then create a branch.
                </p>
              )}
            </div>

            {/* New branch input */}
            <div className="border-t border-border/50 p-2">
              {newBranchMode ? (
                <div className="flex gap-1.5">
                  <Input
                    ref={newBranchInputRef}
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateBranch()
                      if (e.key === 'Escape') { setNewBranchMode(false); setNewBranchName('') }
                    }}
                    placeholder="branch-name"
                    className="h-7 text-xs flex-1"
                    disabled={creatingBranch}
                  />
                  <Button
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCreateBranch}
                    disabled={creatingBranch || !newBranchName.trim() || !currentBranch}
                  >
                    {creatingBranch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setNewBranchMode(true)}
                  disabled={disabled || !currentBranch}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  New branch from {currentBranch?.branchName ?? '…'}
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Diff button — only when on a non-main branch */}
      {!isOnMain && mainBranch && currentBranch && (
        <button
          onClick={() => setDiffOpen(true)}
          disabled={disabled}
          className="flex items-center gap-1 h-7 px-2 rounded-md border border-border/60 bg-background hover:bg-muted/50 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title={`Compare ${currentBranch.branchName} with main`}
        >
          <Diff className="h-3 w-3" />
          <span className="hidden sm:inline">Diff</span>
        </button>
      )}

      {/* Merge to main — only when on a non-main branch */}
      {!isOnMain && currentBranch && (
        <button
          onClick={handleMergeToMain}
          disabled={disabled || merging}
          className="flex items-center gap-1 h-7 px-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Merge this branch into main"
        >
          {merging ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <GitMerge className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">{merging ? 'Merging…' : 'Merge'}</span>
        </button>
      )}

      {/* Timestamp for main branch */}
      {isOnMain && currentBranch?.updatedAt && (
        <span className="flex items-center gap-1 h-7 px-1 text-[10px] text-muted-foreground/60">
          <Clock className="h-2.5 w-2.5" />
          {formatRelative(currentBranch.updatedAt)}
        </span>
      )}

      {/* Inline error */}
      {error && (
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80"
          onClick={() => setError(null)}
          title="Click to dismiss"
        >
          <AlertTriangle className="h-3 w-3" />
          {error}
        </button>
      )}

      {/* Diff modal */}
      {diffData && (
        <TrackerDiffView
          open={diffOpen}
          onOpenChange={setDiffOpen}
          mainBranch={diffData.main}
          currentBranch={diffData.current}
        />
      )}
    </div>
  )
}
