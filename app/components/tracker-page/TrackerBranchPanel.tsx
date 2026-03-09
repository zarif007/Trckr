'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  GitBranch,
  GitMerge,
  Plus,
  Check,
  Loader2,
  Diff,
  Clock,
  User,
  AlertTriangle,
  X,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TrackerDiffView } from './TrackerDiffView'
import type { BranchInfo, GridDataSnapshot } from './TrackerDiffView'

export type { BranchInfo, GridDataSnapshot }

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
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TrackerBranchPanelProps {
  trackerId: string
  currentBranch: BranchRecord | null
  branches: BranchRecord[]
  onBranchSwitch: (branch: BranchRecord) => void
  onBranchCreated: (branch: BranchRecord) => void
  onMergedToMain: (updatedMain: BranchRecord) => void
  getCurrentData: () => GridDataSnapshot
  disabled?: boolean
  open: boolean
  onClose: () => void
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
  open,
  onClose,
}: TrackerBranchPanelProps) {
  const [newBranchMode, setNewBranchMode] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showMerged, setShowMerged] = useState(false)
  const newBranchInputRef = useRef<HTMLInputElement>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOnMain = currentBranch?.branchName === 'main'
  const mainBranch = branches.find((b) => b.branchName === 'main' && !b.isMerged)
  const activeBranches = useMemo(() => branches.filter((b) => !b.isMerged), [branches])
  const mergedBranches = useMemo(() => branches.filter((b) => b.isMerged), [branches])

  useEffect(() => {
    if (newBranchMode) {
      setTimeout(() => newBranchInputRef.current?.focus(), 50)
    }
  }, [newBranchMode])

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const showError = useCallback((msg: string) => {
    setError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), 6000)
  }, [])

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setSuccessMsg(null), 3000)
  }, [])

  const handleCreateBranch = useCallback(async () => {
    const name = newBranchName.trim()
    if (!name || !currentBranch) return

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
      showSuccess(`Branch "${name}" created`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create branch')
    } finally {
      setCreatingBranch(false)
    }
  }, [newBranchName, currentBranch, trackerId, onBranchCreated, showError, showSuccess])

  const handleMergeToMain = useCallback(async () => {
    if (!currentBranch || isOnMain) return

    setMerging(true)
    setError(null)
    setMergeConfirmOpen(false)

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
      showSuccess(`Merged "${currentBranch.branchName}" into main`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to merge')
    } finally {
      setMerging(false)
    }
  }, [currentBranch, isOnMain, trackerId, onMergedToMain, showError, showSuccess])

  const diffData = useMemo<{ main: BranchInfo; current: BranchInfo } | null>(() => {
    if (!mainBranch || !currentBranch || isOnMain) return null
    // Use saved branch data for comparison so the diff is reliable. The live grid
    // (getCurrentData()) can be stale when switching branches because grid state
    // is not reset, so comparing main to currentBranch.data (saved) ensures we
    // show actual differences between the two branches.
    const mainData = mainBranch.data && typeof mainBranch.data === 'object' ? mainBranch.data : {}
    const currentData = currentBranch.data && typeof currentBranch.data === 'object' ? currentBranch.data : {}
    return {
      main: { ...mainBranch, data: mainData },
      current: { ...currentBranch, data: currentData },
    }
  }, [mainBranch, currentBranch, isOnMain])

  return (
    <>
      <div
        className={cn(
          'absolute top-0 right-0 h-full z-30 flex flex-col bg-background border-l border-border/60 shadow-lg transition-all duration-200 ease-in-out',
          open ? 'w-[280px] translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between h-11 px-3 border-b border-border/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            Version Control
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Current branch indicator */}
        {currentBranch && (
          <div className="flex-shrink-0 px-3 py-2.5 border-b border-border/40 bg-muted/20">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">
              Current branch
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                isOnMain
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/60 text-foreground border border-border/50',
              )}>
                <GitBranch className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{currentBranch.branchName}</span>
              </div>
              {currentBranch.updatedAt && (
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelative(currentBranch.updatedAt)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Status messages */}
        {successMsg && (
          <div className="flex-shrink-0 mx-3 mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}
        {error && (
          <button
            type="button"
            onClick={() => setError(null)}
            className="flex-shrink-0 mx-3 mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-[11px] text-destructive hover:bg-destructive/15 transition-colors"
          >
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span className="truncate flex-1 text-left">{error}</span>
            <X className="h-2.5 w-2.5 flex-shrink-0" />
          </button>
        )}

        {/* Actions (Diff + Merge) */}
        {!isOnMain && currentBranch && (
          <div className="flex-shrink-0 px-3 py-2 border-b border-border/40 flex items-center gap-2">
            {mainBranch && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 gap-1.5 text-xs"
                onClick={() => setDiffOpen(true)}
                disabled={disabled}
              >
                <Diff className="h-3.5 w-3.5" />
                Compare with main
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setMergeConfirmOpen(true)}
              disabled={disabled || merging}
            >
              {merging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitMerge className="h-3.5 w-3.5" />
              )}
              {merging ? 'Merging...' : 'Merge'}
            </Button>
          </div>
        )}

        {/* Branch list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Branches ({activeBranches.length})
          </div>

          {activeBranches.length === 0 && (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">
              No branches yet. Save data to get started.
            </p>
          )}

          <div className="px-2 space-y-0.5">
            {activeBranches.map((branch) => {
              const isActive = branch.id === currentBranch?.id
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => onBranchSwitch(branch)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-xs transition-colors',
                    isActive
                      ? 'bg-primary/8 text-primary ring-1 ring-primary/20'
                      : 'hover:bg-muted/60 text-foreground',
                  )}
                >
                  <GitBranch className={cn(
                    'h-3.5 w-3.5 flex-shrink-0',
                    branch.branchName === 'main' ? 'text-primary' : 'text-muted-foreground/60',
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[13px]">{branch.branchName}</div>
                    <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                      {branch.author?.name && (
                        <>
                          <User className="h-2.5 w-2.5" />
                          <span className="truncate">{branch.author.name}</span>
                          <span className="mx-0.5">·</span>
                        </>
                      )}
                      {branch.updatedAt && formatRelative(branch.updatedAt)}
                    </div>
                  </div>
                  {isActive && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>

          {/* Merged branches (collapsible) */}
          {mergedBranches.length > 0 && (
            <div className="mt-3 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowMerged(!showMerged)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold hover:text-muted-foreground transition-colors"
              >
                <ChevronRight className={cn(
                  'h-3 w-3 transition-transform',
                  showMerged && 'rotate-90',
                )} />
                Merged ({mergedBranches.length})
              </button>
              {showMerged && (
                <div className="px-2 pb-2 space-y-0.5">
                  {mergedBranches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground/40"
                    >
                      <GitMerge className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate flex-1">{branch.branchName}</span>
                      <span className="text-[10px] italic">merged</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create branch (bottom) */}
        <div className="flex-shrink-0 border-t border-border/50 p-3">
          {newBranchMode ? (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground">
                New branch from <span className="font-medium text-foreground">{currentBranch?.branchName ?? '...'}</span>
              </div>
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
                  className="h-8 text-xs flex-1"
                  disabled={creatingBranch}
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleCreateBranch}
                  disabled={creatingBranch || !newBranchName.trim() || !currentBranch}
                >
                  {creatingBranch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => { setNewBranchMode(false); setNewBranchName('') }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 gap-1.5 text-xs"
              onClick={() => setNewBranchMode(true)}
              disabled={disabled || !currentBranch}
            >
              <Plus className="h-3.5 w-3.5" />
              New branch
            </Button>
          )}
        </div>
      </div>

      {/* Merge confirmation dialog */}
      <Dialog open={mergeConfirmOpen} onOpenChange={setMergeConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitMerge className="h-4 w-4 text-emerald-600" />
              Merge branch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              This will merge all changes from{' '}
              <span className="font-mono font-medium text-foreground">{currentBranch?.branchName}</span>{' '}
              into{' '}
              <span className="font-mono font-medium text-foreground">main</span>.
            </p>
            <p className="text-xs text-muted-foreground/80">
              The main branch data will be replaced with the branch data.
              The source branch will be marked as merged.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMergeConfirmOpen(false)}
                disabled={merging}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleMergeToMain}
                disabled={merging}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {merging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitMerge className="h-3.5 w-3.5" />
                )}
                {merging ? 'Merging...' : 'Confirm merge'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diff modal */}
      {diffData && (
        <TrackerDiffView
          open={diffOpen}
          onOpenChange={setDiffOpen}
          mainBranch={diffData.main}
          currentBranch={diffData.current}
        />
      )}
    </>
  )
}
