'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { ArrowLeft, LogOut, Moon, MoreHorizontal, Plus, Sun, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { TeamMembersDialog } from './teams'
import { initialSaveState, useTrackerNav } from '@/app/tracker/TrackerNavContext'
import type { TrackerFormAction } from '@/app/components/tracker-display/types'

const DEFAULT_TRACKER_NAME = 'Untitled tracker'
const DRAFT_STATUS_TAG = 'Draft'
const DEFAULT_ACTION_LABEL = 'Save'
const DEFAULT_ACTION_STATUS_TAG = 'Saved'

function createActionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `action_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function TrackerNameEdit({
  name,
  onNameChange,
}: {
  name: string
  onNameChange: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(name)
  }, [name])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed)
    } else {
      setValue(name)
    }
  }, [value, name, onNameChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
    if (e.key === 'Escape') {
      setValue(name)
      setEditing(false)
      inputRef.current?.blur()
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="min-w-[120px] max-w-[min(50vw,360px)] rounded px-1.5 py-0.5 text-base font-bold bg-transparent border border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Tracker name"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="min-w-0 max-w-[min(50vw,360px)] truncate rounded px-1.5 py-0.5 text-left text-base font-bold text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Click to rename"
      aria-label="Tracker name (click to edit)"
    >
      <span className="block truncate">{value || DEFAULT_TRACKER_NAME}</span>
    </button>
  )
}

export default function TrackerNavBar() {
  const router = useRouter()
  const [membersOpen, setMembersOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [themeMounted, setThemeMounted] = useState(false)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const ctx = useTrackerNav()
  const trackerNav = ctx?.trackerNav ?? null
  const {
    onSaveTracker,
    onSaveData,
    isAgentBuilding,
    primaryNavAction,
    autosaveEnabled,
    dataSaveStatus,
    dataSaveError,
    formActions,
    currentFormStatus,
    formActionSaving,
    formActionError,
    canConfigureFormActions,
    onFormActionsChange,
    onFormActionSelect,
    showPreviewSaveButton = false,
    titleEditable: navTitleEditable = false,
  } = ctx?.saveState ?? initialSaveState
  const [actionsConfigOpen, setActionsConfigOpen] = useState(false)
  const [actionsDraft, setActionsDraft] = useState<TrackerFormAction[]>([])
  const [savingTracker, setSavingTracker] = useState(false)
  const [savingData, setSavingData] = useState(false)
  const [manualSaveHintVisible, setManualSaveHintVisible] = useState(false)
  const saveHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLegacySave = Boolean(onSaveTracker || onSaveData)
  const normalizedCurrentStatus = (currentFormStatus ?? '').trim().toLowerCase()
  const activeActionIndex = useMemo(
    () =>
      formActions.findIndex(
        (action) => action.statusTag.trim().toLowerCase() === normalizedCurrentStatus
      ),
    [formActions, normalizedCurrentStatus]
  )
  const nextAction = useMemo(() => {
    if (!onFormActionSelect || formActions.length === 0) return null
    if (activeActionIndex < 0) return formActions[0] ?? null
    const nextIndex = activeActionIndex + 1
    return nextIndex < formActions.length ? formActions[nextIndex] : null
  }, [onFormActionSelect, formActions, activeActionIndex])
  const nextActionIndex = useMemo(() => {
    if (!nextAction) return -1
    return formActions.findIndex((action) => action.id === nextAction.id)
  }, [formActions, nextAction])
  // Current status to show beside title: the step we're at (so after Submit we still show "Submitted")
  const currentStatusTag =
    activeActionIndex >= 0
      ? (formActions[activeActionIndex]?.statusTag.trim() || DRAFT_STATUS_TAG)
      : DRAFT_STATUS_TAG
  const showFormStatus = formActions.length > 0
  const hasInvalidActionDraft = useMemo(
    () =>
      actionsDraft.length === 0 ||
      actionsDraft.some((action) => !action.label.trim() || !action.statusTag.trim()),
    [actionsDraft]
  )
  const actionDraftValidationMessage = useMemo(() => {
    if (actionsDraft.length === 0) return 'Add at least one action.'
    if (actionsDraft.some((action) => !action.label.trim() || !action.statusTag.trim())) {
      return 'Each action needs both a button name and status tag.'
    }
    return null
  }, [actionsDraft])
  const showAutosaveBadge =
    autosaveEnabled && (dataSaveStatus === 'saving' || dataSaveStatus === 'saved' || dataSaveStatus === 'error')

  const autosaveBadgeLabel =
    dataSaveStatus === 'saving'
      ? 'Saving'
      : dataSaveStatus === 'saved'
        ? 'Up to date'
        : dataSaveStatus === 'error'
          ? 'Save failed'
          : ''

  const autosaveBadgeClassName =
    dataSaveStatus === 'saving'
      ? 'border-amber-500/60 bg-amber-500/12 text-amber-800 dark:text-amber-200'
      : dataSaveStatus === 'saved'
        ? 'border-emerald-500/60 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200'
        : 'border-destructive/60 bg-destructive/10 text-destructive'

  const autosaveDotClassName =
    dataSaveStatus === 'saving'
      ? 'bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)] animate-pulse'
      : dataSaveStatus === 'saved'
        ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
        : 'bg-destructive shadow-[0_0_0_3px_rgba(239,68,68,0.25)]'

  useEffect(() => setThemeMounted(true), [])
  useEffect(() => {
    if (themeMounted && theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [themeMounted, theme])
  useEffect(() => {
    return () => {
      if (saveHintTimerRef.current) clearTimeout(saveHintTimerRef.current)
    }
  }, [])
  useEffect(() => {
    if (actionsConfigOpen) {
      if (formActions.length > 0) {
        setActionsDraft(formActions)
        return
      }
      setActionsDraft([
        {
          id: createActionId(),
          label: DEFAULT_ACTION_LABEL,
          statusTag: DEFAULT_ACTION_STATUS_TAG,
          isEditable: true,
        },
      ])
    }
  }, [actionsConfigOpen, formActions])

  const openMembers = () => {
    setAccountOpen(false)
    setMembersOpen(true)
  }

  const showManualSaveHint = useCallback(() => {
    if (saveHintTimerRef.current) clearTimeout(saveHintTimerRef.current)
    setManualSaveHintVisible(true)
    saveHintTimerRef.current = setTimeout(() => {
      saveHintTimerRef.current = null
      setManualSaveHintVisible(false)
    }, 1800)
  }, [])

  const runSaveData = useCallback(async () => {
    if (!onSaveData) return
    setSavingData(true)
    try {
      await Promise.resolve(onSaveData())
      if (!autosaveEnabled) showManualSaveHint()
    } finally {
      setSavingData(false)
    }
  }, [onSaveData, autosaveEnabled, showManualSaveHint])
  const updateDraftAction = useCallback((id: string, patch: Partial<TrackerFormAction>) => {
    setActionsDraft((prev) => prev.map((action) => (action.id === id ? { ...action, ...patch } : action)))
  }, [])
  const removeDraftAction = useCallback((id: string) => {
    setActionsDraft((prev) => prev.filter((action) => action.id !== id))
  }, [])
  const addDraftAction = useCallback(() => {
    setActionsDraft((prev) => [
      ...prev,
      { id: createActionId(), label: '', statusTag: '', isEditable: true },
    ])
  }, [])
  const saveActionDraft = useCallback(() => {
    if (!onFormActionsChange) return
    const normalized = actionsDraft.map((action, index) => ({
      ...action,
      label: action.label.trim(),
      statusTag: action.statusTag.trim(),
      isEditable: index === 0 ? true : action.isEditable,
    }))
    if (normalized.length === 0) return
    onFormActionsChange(normalized)
    setActionsConfigOpen(false)
  }, [actionsDraft, onFormActionsChange])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border/40 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex h-full max-w-full items-center px-3 sm:px-5">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/dashboard')
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            {trackerNav &&
              (navTitleEditable ? (
                <TrackerNameEdit
                  name={trackerNav.name}
                  onNameChange={trackerNav.onNameChange}
                />
              ) : (
                <span
                  className="min-w-0 max-w-[min(50vw,360px)] truncate px-1.5 py-0.5 text-base font-bold text-foreground"
                  title={trackerNav.name || DEFAULT_TRACKER_NAME}
                >
                  {trackerNav.name || DEFAULT_TRACKER_NAME}
                </span>
              ))}
            {showFormStatus && (
              <Badge variant="secondary" className="h-7 shrink-0 px-2 text-[11px]">
                {currentStatusTag}
              </Badge>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            {primaryNavAction && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => router.push(primaryNavAction.href)}
              >
                {primaryNavAction.label}
              </Button>
            )}
            {showAutosaveBadge && (
              <Badge
                variant="outline"
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium shadow-sm backdrop-blur-sm ${autosaveBadgeClassName}`}
                title={
                  dataSaveStatus === 'error'
                    ? dataSaveError ?? 'Failed to save'
                    : 'Changes are saved automatically'
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${autosaveDotClassName}`}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {autosaveBadgeLabel}
                  {dataSaveStatus === 'saving' ? '…' : ''}
                </span>
              </Badge>
            )}
            {nextAction && onFormActionSelect && (
              <div className="relative flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={isAgentBuilding || formActionSaving || !onFormActionSelect}
                  onClick={() => {
                    onFormActionSelect?.(nextAction)
                  }}
                  aria-label={`Run action ${nextAction.label}`}
                >
                  {nextAction.label}
                </Button>
                {formActionError && (
                  <p className="absolute left-0 top-full mt-1 text-[11px] text-destructive whitespace-nowrap">
                    {formActionError}
                  </p>
                )}
              </div>
            )}
            {canConfigureFormActions && onFormActionsChange && (
              <Dialog open={actionsConfigOpen} onOpenChange={setActionsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Actions
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[min(96vw,760px)] p-0 gap-0">
                  <DialogHeader className="px-6 pb-1 pt-6">
                    <DialogTitle className="text-sm">Form actions</DialogTitle>
                    <DialogDescription className="text-[12px] leading-relaxed">
                      Actions run in sequence and are applied automatically in the background when users click them.
                      Configure each row with a button label, next status, and whether fields stay editable after apply.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <div className="mt-3 hidden px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_38px] sm:gap-2">
                      <span>Button name</span>
                      <span>Status tag</span>
                      <span>Editable</span>
                      <span className="sr-only">Remove</span>
                    </div>
                    <div className="mt-2 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                      {actionsDraft.map((action, index) => (
                        <div
                          key={action.id}
                          className="rounded-lg border border-border/60 bg-muted/[0.15] p-2.5"
                        >
                          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_38px]">
                            <Input
                              value={action.label}
                              onChange={(e) => updateDraftAction(action.id, { label: e.target.value })}
                              placeholder="Button name"
                              className="h-8 text-xs"
                            />
                            <Input
                              value={action.statusTag}
                              onChange={(e) => updateDraftAction(action.id, { statusTag: e.target.value })}
                              placeholder="Status tag"
                              className="h-8 text-xs"
                            />
                            <label className="flex h-8 items-center gap-1.5 rounded-md border border-border/60 px-2 text-[11px] text-muted-foreground">
                              <Checkbox
                                checked={index === 0 ? true : action.isEditable}
                                onCheckedChange={(checked) => {
                                  if (index === 0) return
                                  updateDraftAction(action.id, { isEditable: checked === true })
                                }}
                                disabled={index === 0}
                              />
                              Editable
                            </label>
                            <div className="flex justify-end">
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeDraftAction(action.id)}
                                  aria-label="Remove action"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addDraftAction}>
                        <Plus className="h-3.5 w-3.5" />
                        Add action
                      </Button>
                      <p className="text-[11px] text-muted-foreground">
                        First action is mandatory, non-removable, and always editable.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-destructive">{actionDraftValidationMessage ?? ''}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setActionsConfigOpen(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveActionDraft} disabled={hasInvalidActionDraft}>
                          Save actions
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {!nextAction && hasLegacySave && !onFormActionSelect && !autosaveEnabled && !showPreviewSaveButton && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={isAgentBuilding || savingTracker || savingData}
                onClick={async () => {
                  if (onSaveTracker) {
                    setSavingTracker(true)
                    try {
                      await onSaveTracker()
                    } finally {
                      setSavingTracker(false)
                    }
                    return
                  }
                  if (onSaveData) {
                    await runSaveData()
                  }
                }}
                aria-label={onSaveTracker ? 'Save tracker' : 'Save data'}
              >
                Save
              </Button>
            )}
            {manualSaveHintVisible && (
              <div
                className="absolute right-0 top-full mt-1.5 rounded-md border border-emerald-500/40 bg-background/95 px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-sm dark:text-emerald-300"
                role="status"
                aria-live="polite"
              >
                Data saved
              </div>
            )}
            <Popover open={accountOpen} onOpenChange={setAccountOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Account and settings"
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-1.5" sideOffset={6}>
                {session?.user?.email && (
                  <p className="truncate px-2 py-1.5 text-xs text-muted-foreground" title={session.user.email}>
                    {session.user.email}
                  </p>
                )}
                <div className="my-1 h-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 px-2 font-normal text-muted-foreground hover:text-foreground"
                  onClick={openMembers}
                >
                  <Users className="h-4 w-4" />
                  Members
                </Button>
                {themeMounted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 px-2 font-normal text-muted-foreground hover:text-foreground"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </Button>
                )}
                <div className="my-1 h-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 px-2 font-normal text-muted-foreground hover:text-foreground"
                  onClick={() => signOut({ redirectTo: '/' })}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </nav>
      <TeamMembersDialog open={membersOpen} onOpenChange={setMembersOpen} />
    </header>
  )
}
