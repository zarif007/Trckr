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
import { theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#examples', label: 'Examples' },
  { href: '#demo', label: 'Demo' },
]

const navLinkClass =
  'font-mono text-[9px] font-medium uppercase tracking-[0.16em] transition-colors sm:text-[10px] sm:tracking-[0.18em] md:text-[11px]'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated' && !!session

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50',
        'bg-background/88 dark:bg-background/80',
        'shadow-[0_1px_0_0_hsl(var(--border)/0.2)_inset]',
      )}
    >
      <nav className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[3.75rem] sm:gap-6 sm:px-6 lg:px-8">
        {/* Left: segmented nav (desktop) */}
        <div className="flex min-w-0 flex-1 items-center md:min-w-0">
          <div className="w-10 shrink-0 md:hidden" aria-hidden />
          <nav
            className="hidden md:flex"
            aria-label="Primary"
          >
            <div
              className={cn(
                'flex items-stretch overflow-hidden border backdrop-blur-sm rounded-md',
                theme.border.subtleAlt,
                theme.surface.secondaryLight,
              )}
            >
              {navLinks.map(({ href, label }, i) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    navLinkClass,
                    'flex items-center px-3.5 py-2.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                    'outline-none focus-visible:bg-muted/40 focus-visible:text-foreground',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    i > 0 && 'border-l border-border/40',
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {/* Center: logo in a small blueprint frame */}
        <Link
          href="/"
          className={cn(
            'absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
            'border bg-background/70 backdrop-blur-sm',
            theme.border.subtleAlt,
            'rounded-md outline-none transition-colors',
            'hover:border-border hover:bg-muted/30',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
          aria-label="trckr home"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-foreground"
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

        {/* Right: theme + account */}
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="hidden shrink-0 items-center gap-2 sm:gap-3 md:flex">
            <ThemeToggle
              className={cn(
                'rounded-md border shadow-none',
                theme.border.subtleAlt,
                theme.surface.secondaryLight,
                'hover:bg-muted/40',
              )}
            />
            {isSignedIn && session?.user ? (
              <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-2.5 border px-2 py-1.5 pr-3 text-sm text-foreground backdrop-blur-sm',
                      theme.border.subtleAlt,
                      theme.surface.secondaryLight,
                      'rounded-md outline-none transition-colors hover:bg-muted/40',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    )}
                    aria-label="Open user menu"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={21}
                        height={21}
                        className="rounded-md ring-1 ring-border/50"
                      />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-xs font-medium text-foreground">
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
                  className={cn(
                    'w-56 overflow-hidden border bg-popover p-0 shadow-lg',
                    theme.border.default,
                    'rounded-md',
                  )}
                  sideOffset={8}
                >
                  <div className="truncate border-b border-border px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {session.user.email}
                  </div>
                  <div className="flex flex-col gap-0.5 p-1.5">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" />
                      Dashboard
                    </Link>
                    <Link
                      href="/tracker"
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Plus className="h-4 w-4 shrink-0 opacity-70" />
                      New tracker
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
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
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className={cn(
                  'rounded-md border-border/80 bg-background/60 px-4 py-2 text-xs font-medium backdrop-blur-sm',
                  'hover:bg-muted/40 sm:text-sm',
                )}
              >
                <Link href="/login?callbackUrl=/tracker">Sign in</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex shrink-0 items-center md:hidden">
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn(
              'flex h-10 w-10 items-center justify-center border backdrop-blur-sm',
              theme.border.subtleAlt,
              theme.surface.secondaryLight,
              'rounded-md text-foreground transition-colors',
              'hover:bg-muted/40 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
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

      {open && (
        <div className="md:hidden">
          <div
            className={cn(
              'mx-3 mb-3 border bg-background/95 backdrop-blur-xl',
              theme.border.subtleAlt,
              'overflow-hidden rounded-md shadow-sm',
            )}
          >
            <div className="px-0 py-0 sm:px-0">
              <nav
                className="flex flex-col divide-y divide-border/40 border-b border-border/40 overflow-hidden"
                aria-label="Main"
              >
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      navLinkClass,
                      'px-5 py-4 text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground active:bg-muted/50',
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div
                className={cn(
                  'mx-4 my-4 flex items-center justify-between border px-4 py-3',
                  theme.border.subtleAlt,
                  theme.surface.secondaryLight,
                  'rounded-md',
                )}
              >
                <span
                  className={cn(
                    navLinkClass,
                    'text-foreground',
                  )}
                >
                  Theme
                </span>
                <ThemeToggle
                  className={cn(
                    'rounded-md border shadow-none',
                    theme.border.subtleAlt,
                    'bg-background/80 hover:bg-muted/40',
                  )}
                />
              </div>

              <div className="space-y-3 border-t border-border/40 px-4 pb-5 pt-4">
                {isSignedIn && session?.user ? (
                  <>
                    <div
                      className={cn(
                        'flex items-center gap-3 border px-4 py-3',
                        theme.border.subtleAlt,
                        theme.surface.secondaryLight,
                        'rounded-md',
                      )}
                    >
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-md ring-1 ring-border/50"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-sm font-semibold text-foreground">
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
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {session.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-11 rounded-md border-border/80 font-medium',
                          theme.surface.secondaryLight,
                        )}
                      >
                        <Link href="/dashboard" onClick={() => setOpen(false)}>
                          Dashboard
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-11 rounded-md border-border/80 font-medium',
                          theme.surface.secondaryLight,
                        )}
                      >
                        <Link href="/tracker" onClick={() => setOpen(false)}>
                          New tracker
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 rounded-md font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
                    className="h-12 w-full rounded-md font-medium"
                    variant="outline"
                  >
                    <Link
                      href="/login?callbackUrl=/tracker"
                      onClick={() => setOpen(false)}
                    >
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
