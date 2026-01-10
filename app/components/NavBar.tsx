'use client'

import { useState } from 'react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-card/80 backdrop-blur-lg border border-border dark:border-border/80 shadow-lg flex items-center justify-center">
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              }}
              className="dark:shadow-[0_10px_30px_rgba(139,92,246,0.3)]"
            />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Trckr</h1>
            <p className="text-muted-foreground text-sm">Track Anything</p>
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
            <Button asChild>
              <Link href="#demo">Try the guided demo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="#demo">Get Started</Link>
            </Button>
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
        <div className="md:hidden mt-3 space-y-3 bg-card/60 p-4 rounded-lg border border-border dark:border-border/80">
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
