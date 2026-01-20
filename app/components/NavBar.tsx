'use client'

import { useState } from 'react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 flex items-center justify-center">
            <div
              style={{
                width: 20,
                height: 20,
                background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                borderRadius: '50%',
              }}
              className="transition-transform group-hover:scale-110"
            />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tighter text-foreground">Trckr</h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="#how"
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#samples"
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Examples
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md bg-card/60 border border-border dark:border-border/80 hover:bg-card/70 transition"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden mt-3 space-y-3 bg-card/60 p-4 rounded-md border border-border dark:border-border/80">
          <div className="flex flex-col gap-2">
            <Link
              href="#how"
              onClick={() => setOpen(false)}
              className="text-foreground font-medium"
            >
              How it works
            </Link>
            <Link
              href="#samples"
              onClick={() => setOpen(false)}
              className="text-foreground font-medium"
            >
              Examples
            </Link>
          </div>

          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="#demo">Try demo</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="#demo">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
