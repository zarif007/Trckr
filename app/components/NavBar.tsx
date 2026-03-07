'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { LayoutDashboard, LogOut, Plus } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const navLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#examples', label: 'Examples' },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated' && !!session

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 text-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <nav className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Left: nav links (desktop); spacer on mobile so logo stays centered */}
        <div className="flex min-w-0 flex-1 items-center md:min-w-0">
          <div className="w-10 shrink-0 md:hidden" aria-hidden />
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground border-b-2 border-transparent hover:border-foreground/30"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Center: logo only (icon) */}
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
          aria-label="trckr home"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-9 w-9 text-foreground"
            aria-hidden
          >
            <path
              d="M12 3L20 7.5L12 12L4 7.5L12 3Z"
              fill="currentColor"
              className="opacity-100"
            />
            <path
              d="M12 12L20 7.5V16.5L12 21V12Z"
              fill="currentColor"
              className="opacity-70"
            />
            <path
              d="M12 12L4 7.5V16.5L12 21V12Z"
              fill="currentColor"
              className="opacity-40"
            />
          </svg>
        </Link>

        {/* Right: theme + user / sign in (desktop) */}
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <ThemeToggle />
            {isSignedIn && session?.user ? (
              <>
                <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2.5 rounded-md border border-border bg-muted/50 px-2 py-1.5 pr-3 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="Open user menu"
                    >
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt=""
                          width={26}
                          height={26}
                          className="rounded-full ring-1 ring-border"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {(session.user.name ?? session.user.email ?? '?')
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                      <span className="max-w-[100px] truncate font-medium">
                        {session.user.name ?? session.user.email ?? 'User'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-56 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
                    sideOffset={8}
                  >
                    <div className="mb-1.5 truncate border-b border-border px-3 py-2 text-xs text-muted-foreground">
                      {session.user.email}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" />
                        Dashboard
                      </Link>
                      <Link
                        href="/tracker"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Plus className="h-4 w-4 shrink-0 opacity-70" />
                        New tracker
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => {
                          setUserMenuOpen(false)
                          signOut({ redirectTo: '/' })
                        }}
                      >
                        <LogOut className="h-4 w-4 shrink-0 opacity-70" />
                        Sign out
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <Button
                asChild
                size="sm"
                className="rounded-md px-4 py-2 text-xs font-medium uppercase tracking-widest"
              >
                <Link href="/login?callbackUrl=/tracker">Sign in</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile: hamburger only (theme toggle is inside the menu) */}
        <div className="flex shrink-0 items-center md:hidden">
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-foreground transition-colors hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {open ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="shrink-0"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="shrink-0"
              >
                <path d="M5 7h14M5 12h14M5 17h14" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden">
          <div className="mx-3 mb-3 overflow-hidden rounded-2xl border border-border/60 bg-background/98 shadow-lg shadow-black/5 backdrop-blur-xl dark:shadow-black/20">
            <div className="px-4 py-5 sm:px-5">
              {/* Nav links */}
              <nav className="flex flex-col gap-0.5" aria-label="Main">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 active:bg-muted/80"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Theme */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Theme</span>
                <ThemeToggle />
              </div>

              {/* Account section */}
              <div className="mt-5 space-y-3 border-t border-border/50 pt-5">
                {isSignedIn && session?.user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-full ring-2 ring-border/50"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {(session.user.name ?? session.user.email ?? '?')
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {session.user.name ?? session.user.email ?? 'User'}
                        </p>
                        {session.user.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {session.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button asChild size="sm" className="h-10 rounded-xl font-medium" variant="default">
                        <Link href="/dashboard" onClick={() => setOpen(false)}>
                          Dashboard
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="h-10 rounded-xl font-medium" variant="outline">
                        <Link href="/tracker" onClick={() => setOpen(false)}>
                          New tracker
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        onClick={() => {
                          setOpen(false)
                          signOut({ redirectTo: '/' })
                        }}
                      >
                        Sign out
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    className="h-11 w-full rounded-xl font-medium"
                    variant="default"
                  >
                    <Link href="/login?callbackUrl=/tracker" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
