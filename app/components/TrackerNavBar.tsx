'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

export default function TrackerNavBar() {
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

          <div className="flex items-center gap-1 justify-end">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  )
}
