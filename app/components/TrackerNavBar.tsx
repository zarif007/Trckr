'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { ArrowLeft, ChevronDown, Database, Layout, LogOut, Moon, MoreHorizontal, Save, Sun, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TeamMembersDialog } from './teams'
import { useTrackerNav } from '@/app/tracker/TrackerNavContext'

const DEFAULT_TRACKER_NAME = 'Untitled tracker'

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
  } = ctx?.saveState ?? {
    onSaveTracker: null,
    onSaveData: null,
    isAgentBuilding: false,
    primaryNavAction: null,
    autosaveEnabled: false,
    dataSaveStatus: 'idle' as const,
    dataSaveError: null as string | null,
  }
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [savingTracker, setSavingTracker] = useState(false)
  const [savingData, setSavingData] = useState(false)
  const [manualSaveHintVisible, setManualSaveHintVisible] = useState(false)
  const saveHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSave = Boolean(onSaveTracker || onSaveData)
  const hasBothSaveOptions = Boolean(onSaveTracker && onSaveData)
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
            {trackerNav && (
              <TrackerNameEdit
                name={trackerNav.name}
                onNameChange={trackerNav.onNameChange}
              />
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
            {hasSave && !hasBothSaveOptions && (
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
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            )}
            {hasBothSaveOptions && (
              <Popover open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={isAgentBuilding || savingTracker || savingData}
                    aria-label="Save — tracker or data"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-1.5" sideOffset={6}>
                  <p className="px-2 py-1.5 text-[11px] text-muted-foreground border-b border-border/60 mb-1">
                    What do you want to save?
                  </p>
                  {onSaveTracker && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start gap-2 px-2 font-normal text-foreground hover:bg-muted"
                      disabled={savingTracker}
                      onClick={async () => {
                        setSavingTracker(true)
                        try {
                          await onSaveTracker()
                          setSaveMenuOpen(false)
                        } finally {
                          setSavingTracker(false)
                        }
                      }}
                    >
                      <Layout className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex flex-col items-start">
                        <span>Save tracker</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Name and structure</span>
                      </span>
                    </Button>
                  )}
                  {onSaveData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start gap-2 px-2 font-normal text-foreground hover:bg-muted"
                      disabled={savingData}
                      onClick={async () => {
                        await runSaveData()
                        setSaveMenuOpen(false)
                      }}
                    >
                      <Database className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex flex-col items-start">
                        <span>Save data</span>
                        <span className="text-[10px] font-normal text-muted-foreground">Current grid as snapshot</span>
                      </span>
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
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
