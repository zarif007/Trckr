'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Loader2,
  Monitor,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardProvider, useDashboard } from './dashboard-context'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const pathname = usePathname()
  const {
    projects,
    fetchProjects,
    sidebarCollapsed,
    setSidebarCollapsed,
    projectsLoading,
  } = useDashboard()

  useEffect(() => {
    if (status === 'authenticated') fetchProjects()
  }, [status, fetchProjects])

  const totalTrackers = projects.reduce(
    (acc, p) => acc + p.trackerSchemas.length,
    0
  )
  const lastActivity =
    projects.length > 0
      ? projects
          .flatMap((p) =>
            p.trackerSchemas.map((t) => ({ date: t.updatedAt, name: p.name }))
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]
      : null
  const isDesktop = pathname === '/dashboard'
  const currentProjectId = pathname.startsWith('/dashboard/')
    ? pathname.split('/')[2] ?? null
    : null

  if (status === 'loading' || (status === 'authenticated' && projectsLoading)) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Booting…
        </p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
          <Monitor className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Trckr</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Sign in to access your workspace.
          </p>
        </div>
        <Button asChild size="sm" variant="secondary" className="rounded-full px-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground overflow-hidden flex flex-col font-sans select-none mt-10">
      <header className="h-9 flex-shrink-0 border-b border-border/60 flex items-center justify-between px-3 bg-background/95" />
      <div className="flex flex-1 min-h-0">
        <aside
          className={cn(
            'flex-shrink-0 border-r border-border/50 flex flex-col bg-muted/20 transition-[width] duration-200',
            sidebarCollapsed ? 'w-12' : 'w-52'
          )}
        >
          <div className="p-2 flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                isDesktop
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-xs truncate">Desktop</span>
              )}
            </Link>
            {!sidebarCollapsed && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Folders
                </div>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/${project.id}`}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                      project.id === currentProjectId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <FolderOpen className="h-4 w-4 flex-shrink-0 opacity-70" />
                    <span className="text-xs truncate flex-1">
                      {project.name || 'Untitled folder'}
                    </span>
                    {project.trackerSchemas.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                        {project.trackerSchemas.length}
                      </span>
                    )}
                  </Link>
                ))}
              </>
            )}
          </div>
          <div
            className={cn(
              'border-t border-border/50 p-2 bg-background/50',
              sidebarCollapsed && 'flex flex-col items-center gap-1'
            )}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30">
              <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    This PC
                  </p>
                  <p className="text-[11px] text-foreground/80 tabular-nums truncate">
                    {projects.length} folders · {totalTrackers} trackers
                  </p>
                  {lastActivity && (
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                      Last:{' '}
                      {new Date(lastActivity.date).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric' }
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1 rounded hover:bg-muted/60 text-muted-foreground"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="mt-1 w-full flex justify-end p-1 rounded hover:bg-muted/60 text-muted-foreground"
                aria-label="Collapse sidebar"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-[270deg]" />
              </button>
            )}
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">{children}</div>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  )
}
