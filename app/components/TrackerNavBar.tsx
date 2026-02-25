'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ThemeToggle from './ThemeToggle'
import { TeamSwitcher, TeamMembersDialog } from './teams'

export default function TrackerNavBar() {
  const [membersOpen, setMembersOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background shadow-[0_1px_0_0_hsl(var(--border)/0.5)]">
      <nav className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted transition-colors text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden />
            <span>Back</span>
          </Link>

          <div className="flex items-center gap-2 justify-end">
            <TeamSwitcher />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMembersOpen(true)}
              aria-label="Team members and invite"
            >
              <Users className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <TeamMembersDialog open={membersOpen} onOpenChange={setMembersOpen} />
    </header>
  )
}
