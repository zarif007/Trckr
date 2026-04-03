'use client'

import { useState, type ReactNode } from 'react'
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

function UserMenu({
 trigger,
}: {
 trigger: ReactNode
}) {
 const [userMenuOpen, setUserMenuOpen] = useState(false)
 const { data: session } = useSession()
 const user = session?.user
 if (!user) return null

 return (
 <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
 <PopoverTrigger asChild>{trigger}</PopoverTrigger>
 <PopoverContent
 align="end"
 className={cn(
 'w-56 overflow-hidden border bg-popover p-0 ',
 theme.border.default,
 'rounded-sm',
 )}
 sideOffset={8}
 >
 <div
 className={cn(
 'truncate border-b border-border px-3 py-2.5',
 theme.typography.monoOverlineMuted,
 )}
 >
 {user.email}
 </div>
 <div className="flex flex-col gap-0.5 p-1.5">
 <Link
 href="/dashboard"
 className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
 onClick={() => setUserMenuOpen(false)}
 >
 <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" />
 Dashboard
 </Link>
 <Link
 href="/tracker"
 className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
 onClick={() => setUserMenuOpen(false)}
 >
 <Plus className="h-4 w-4 shrink-0 opacity-70" />
 New tracker
 </Link>
 <button
 type="button"
 className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
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
 )
}

export default function NavBar() {
 const [open, setOpen] = useState(false)
 const { data: session, status } = useSession()
 const isSignedIn = status === 'authenticated' && !!session

 return (
 <header
 className={cn(
 'fixed left-0 right-0 top-0 z-50',
 'bg-background/88 dark:bg-background/80',

 )}
 >
 <nav className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[3.75rem] sm:gap-6 sm:px-6 lg:px-8">
 {/* Left: mobile menu + segmented nav (desktop) */}
 <div className="flex min-w-0 flex-1 items-center gap-2 md:min-w-0 md:gap-0">
 <div className="flex shrink-0 items-center md:hidden">
 <button
 type="button"
 aria-label={open ? 'Close menu' : 'Open menu'}
 aria-expanded={open}
 onClick={() => setOpen(!open)}
 className={cn(
 'flex h-8 w-8 items-center justify-center border backdrop-blur-sm',
 theme.border.subtleAlt,
 theme.surface.secondaryLight,
 'rounded-sm text-foreground transition-colors',
 'hover:bg-muted/40 active:scale-[0.98]',
 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
 )}
 >
 {open ? (
 <svg
 width="18"
 height="18"
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
 width="18"
 height="18"
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
 <nav
 className="hidden md:flex"
 aria-label="Primary"
 >
 <div
 className={cn(
 'flex items-stretch overflow-hidden border backdrop-blur-sm rounded-sm',
 theme.border.subtleAlt,
 theme.surface.secondaryLight,
 )}
 >
 {navLinks.map(({ href, label }, i) => (
 <Link
 key={href}
 href={href}
 className={cn(
 theme.typography.segmentedNavLabel,
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
 'rounded-sm outline-none transition-colors',
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

 {/* Right: theme + account (desktop); account / sign in (mobile) */}
 <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
 <div className="hidden shrink-0 items-center gap-2 sm:gap-3 md:flex">
 <ThemeToggle
 className={cn(
 'rounded-sm border ',
 theme.border.subtleAlt,
 theme.surface.secondaryLight,
 'hover:bg-muted/40',
 )}
 />
 {isSignedIn && session?.user ? (
 <UserMenu
 trigger={
 <button
 type="button"
 className={cn(
 'flex items-center gap-2.5 border p-1 text-sm text-foreground backdrop-blur-sm',
 theme.border.subtleAlt,
 theme.surface.secondaryLight,
 'rounded-sm outline-none transition-colors hover:bg-muted/40',
 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
 )}
 aria-label="Open user menu"
 >
 {session.user.image ? (
 <Image
 src={session.user.image}
 alt=""
 width={27}
 height={27}
 className="rounded-sm ring-1 ring-border/50"
 />
 ) : (
 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-muted/40 text-xs font-medium text-foreground">
 {(session.user.name ?? session.user.email ?? '?')
 .charAt(0)
 .toUpperCase()}
 </span>
 )}
 </button>
 }
 />
 ) : (
 <Button
 asChild
 size="sm"
 variant="outline"
 className={cn(
 'rounded-sm border-border/80 bg-background/60 px-4 py-2 text-xs font-medium backdrop-blur-sm',
 'hover:bg-muted/40 sm:text-sm',
 )}
 >
 <Link href="/login?callbackUrl=/tracker">Sign in</Link>
 </Button>
 )}
 </div>

 <div className="flex shrink-0 items-center md:hidden">
 {isSignedIn && session?.user ? (
 <UserMenu
 trigger={
 <button
 type="button"
 className={cn(
 'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border backdrop-blur-sm',
 theme.border.subtleAlt,
 theme.surface.secondaryLight,
 'rounded-sm outline-none transition-colors hover:bg-muted/40',
 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
 )}
 aria-label="Open user menu"
 >
 {session.user.image ? (
 <Image
 src={session.user.image}
 alt=""
 width={32}
 height={32}
 className="h-full w-full rounded-sm object-cover ring-1 ring-border/50"
 />
 ) : (
 <span className="flex h-full w-full items-center justify-center rounded-sm bg-muted/40 text-[11px] font-semibold leading-none text-foreground">
 {(session.user.name ?? session.user.email ?? '?')
 .charAt(0)
 .toUpperCase()}
 </span>
 )}
 </button>
 }
 />
 ) : (
 <Button
 asChild
 size="sm"
 variant="outline"
 className={cn(
 'h-8 shrink-0 rounded-sm border-border/80 bg-background/60 px-2 text-[11px] font-medium backdrop-blur-sm',
 'hover:bg-muted/40',
 )}
 >
 <Link href="/login?callbackUrl=/tracker">Sign in</Link>
 </Button>
 )}
 </div>
 </div>
 </nav>

 {open && (
 <div className="md:hidden">
 <div
 className={cn(
 'mx-3 mb-3 border bg-background/95 backdrop-blur-xl',
 theme.border.subtleAlt,
 'overflow-hidden rounded-sm ',
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
 theme.typography.segmentedNavLabel,
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
 'rounded-sm',
 )}
 >
 <span
 className={cn(
 theme.typography.segmentedNavLabel,
 'text-foreground',
 )}
 >
 Theme
 </span>
 <ThemeToggle
 className={cn(
 'rounded-sm border ',
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
 'rounded-sm',
 )}
 >
 {session.user.image ? (
 <Image
 src={session.user.image}
 alt=""
 width={40}
 height={40}
 className="rounded-sm ring-1 ring-border/50"
 />
 ) : (
 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/40 text-sm font-semibold text-foreground">
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
 <p
 className={cn(
 'truncate',
 theme.typography.monoCaptionMuted,
 )}
 >
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
 'h-11 rounded-sm border-border/80 font-medium',
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
 'h-11 rounded-sm border-border/80 font-medium',
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
 className={cn(
 'h-11 rounded-sm hover:bg-muted/50 hover:text-foreground',
 theme.typography.monoUppercaseXsMuted,
 )}
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
 className="h-12 w-full rounded-sm font-medium"
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
