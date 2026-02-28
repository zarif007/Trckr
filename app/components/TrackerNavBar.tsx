'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { ArrowLeft, LogOut, Moon, MoreHorizontal, Save, Sun, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TeamSwitcher, TeamMembersDialog } from './teams'
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
  const [membersOpen, setMembersOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [themeMounted, setThemeMounted] = useState(false)
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const ctx = useTrackerNav()
  const trackerNav = ctx?.trackerNav ?? null
  const { onSaveTracker, isAgentBuilding } = ctx?.saveState ?? { onSaveTracker: null, isAgentBuilding: false }
  const [saving, setSaving] = useState(false)

  useEffect(() => setThemeMounted(true), [])
  useEffect(() => {
    if (themeMounted && theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [themeMounted, theme])

  const openMembers = () => {
    setAccountOpen(false)
    setMembersOpen(true)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border/40 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex h-full max-w-full items-center px-3 sm:px-5">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            {trackerNav && (
              <TrackerNameEdit
                name={trackerNav.name}
                onNameChange={trackerNav.onNameChange}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSaveTracker && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={isAgentBuilding || saving}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await onSaveTracker()
                  } finally {
                    setSaving(false)
                  }
                }}
                aria-label="Save tracker to database"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
            <TeamSwitcher />
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
