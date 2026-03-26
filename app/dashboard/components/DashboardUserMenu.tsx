'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import { LogOut, Users } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const TRIGGER = {
  sm: {
    box: 'h-6 w-6',
    img: 24,
    initial: 'text-[10px]',
  },
  md: {
    box: 'h-8 w-8',
    img: 32,
    initial: 'text-[11px]',
  },
} as const

export type DashboardUserMenuProps = {
  /** `md` aligns with the sidebar logo tile; `sm` fits the collapsed rail. */
  triggerSize?: keyof typeof TRIGGER
}

export function DashboardUserMenu({ triggerSize = 'sm' }: DashboardUserMenuProps) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const t = TRIGGER[triggerSize]

  const handleSwitchAccount = async () => {
    setOpen(false)
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}` || '/dashboard'
        : '/dashboard'
    await signOut({ redirect: false })
    await signIn('google', { redirectTo }, { prompt: 'select_account' })
  }

  const handleSignOut = () => {
    setOpen(false)
    void signOut({ redirectTo: '/' })
  }

  if (status === 'loading') {
    return (
      <div
        className={cn(
          'shrink-0 rounded-md bg-muted/50 animate-pulse',
          t.box,
        )}
        aria-hidden
      />
    )
  }

  if (!session?.user) {
    return null
  }

  const { user } = session
  const label = user.name ?? user.email ?? 'Account'
  const initial = (user.name ?? user.email ?? '?').charAt(0).toUpperCase()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border/50 bg-muted/30 outline-none transition-colors',
            t.box,
            'hover:border-border hover:bg-muted/50',
            'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
          aria-label={`Account: ${label}`}
          aria-haspopup="dialog"
        >
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={t.img}
              height={t.img}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={cn(
                'font-semibold text-foreground/80',
                t.initial,
              )}
            >
              {initial}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn(
          'w-60 overflow-hidden border bg-popover p-0 shadow-lg',
          theme.border.default,
          'rounded-md',
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-border/50"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-sm font-semibold text-foreground">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name ?? 'Signed in'}
            </p>
            {user.email && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 p-1.5">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={() => void handleSwitchAccount()}
          >
            <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            Switch Google account
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
