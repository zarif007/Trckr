'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { LayoutDashboard, LogOut } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated' && !!session

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-xs">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center relative">
              <div className="relative w-12 h-12 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full text-foreground"
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
              </div>
            </div>
          </Link>

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
              {isSignedIn && session?.user ? (
                <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1.5 pr-3 hover:bg-muted/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Open user menu"
                    >
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {(session.user.name ?? session.user.email ?? '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                        {session.user.name ?? session.user.email ?? 'User'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1">
                    <div className="px-2 py-1.5 text-sm text-muted-foreground border-b border-border mb-1">
                      {session.user.email}
                    </div>
                    <Link
                      href="/tracker"
                      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Go to tracker
                    </Link>
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted text-foreground"
                      onClick={() => { setUserMenuOpen(false); signOut({ redirectTo: '/' }) }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button asChild size="sm">
                  <Link href="/login?callbackUrl=/tracker">Sign in</Link>
                </Button>
              )}
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

            <div className="flex flex-col gap-2">
              <Button asChild size="sm">
                <Link href="#demo" onClick={() => setOpen(false)}>Try demo</Link>
              </Button>
              {isSignedIn && session?.user ? (
                <>
                  <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {(session.user.name ?? session.user.email ?? '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.user.name ?? session.user.email ?? 'User'}
                      </p>
                      {session.user.email && (
                        <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                      )}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/tracker" onClick={() => setOpen(false)}>Go to tracker</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setOpen(false); signOut({ redirectTo: '/' }) }}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href="/login?callbackUrl=/tracker" onClick={() => setOpen(false)}>Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
