'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createPortal } from 'react-dom'
import {
  Loader2,
  Monitor,
  FolderOpen,
  Folder,
  HardDrive,
  LayoutGrid,
  Activity,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardProvider, useDashboard, type Project } from '../../dashboard-context'
import { QueryClientProviderWrapper } from './QueryClientProviderWrapper'

type SidebarContextItem =
  | { kind: 'project'; id: string; label: string }
  | { kind: 'module'; id: string; label: string }

function SidebarProject({
  project,
  currentProjectId,
  currentModuleId,
  onContextMenu,
}: {
  project: Project
  currentProjectId: string | null
  currentModuleId: string | null
  onContextMenu: (e: React.MouseEvent, item: SidebarContextItem) => void
}) {
  const isActive = project.id === currentProjectId && !currentModuleId
  const hasModules = project.modules.length > 0
  const containsActive = project.id === currentProjectId
  const [expanded, setExpanded] = useState(containsActive && hasModules)

  useEffect(() => {
    if (containsActive && hasModules) setExpanded(true)
  }, [containsActive, hasModules])

  const projectLevelTrackers = (project.trackerSchemas ?? []).filter(
    (t) => !t.moduleId
  )
  const itemCount =
    projectLevelTrackers.length +
    project.modules.length +
    (project.projectFiles?.length ?? 0)

  return (
    <div className="min-w-0">
      <div className="flex items-center min-w-0">
        {hasModules && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <Link
          href={`/dashboard/${project.id}`}
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors min-w-0 flex-1 overflow-hidden',
            !hasModules && 'ml-[18px]',
            isActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
          onContextMenu={(e) =>
            onContextMenu(e, {
              kind: 'project',
              id: project.id,
              label: project.name || 'Untitled folder',
            })
          }
        >
          <FolderOpen className="h-4 w-4 flex-shrink-0 opacity-70" />
          <span className="text-xs truncate flex-1">
            {project.name || 'Untitled folder'}
          </span>
          {itemCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
      {expanded && (
        <div className="ml-5 mr-1.5 mt-0.5 flex flex-col gap-0.5 min-w-0">
          {project.modules.map((mod) => {
            const isModuleActive =
              project.id === currentProjectId && mod.id === currentModuleId
            return (
              <Link
                key={mod.id}
                href={`/dashboard/${project.id}/module/${mod.id}`}
                className={cn(
                  'flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md text-left transition-colors min-w-0 overflow-hidden',
                  isModuleActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                onContextMenu={(e) =>
                  onContextMenu(e, {
                    kind: 'module',
                    id: mod.id,
                    label: mod.name || 'Untitled module',
                  })
                }
              >
                <Folder className="h-3 w-3 flex-shrink-0 opacity-70" />
                <span className="text-[11px] truncate flex-1 min-w-0">
                  {mod.name || 'Untitled module'}
                </span>
                {(mod.trackerSchemas?.length ?? 0) > 0 && (
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums flex-shrink-0">
                    {mod.trackerSchemas?.length ?? 0}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const {
    projects,
    setProjects,
    fetchProjects,
    sidebarCollapsed,
    setSidebarCollapsed,
    projectsLoading,
  } = useDashboard()

  const [sidebarContextMenu, setSidebarContextMenu] = useState<{
    x: number
    y: number
    item: SidebarContextItem
  } | null>(null)

  useEffect(() => {
    const close = () => setSidebarContextMenu(null)
    if (sidebarContextMenu) {
      window.addEventListener('click', close)
      return () => window.removeEventListener('click', close)
    }
  }, [sidebarContextMenu])

  const openSidebarContextMenu = useCallback(
    (e: React.MouseEvent, item: SidebarContextItem) => {
      e.preventDefault()
      e.stopPropagation()
      setSidebarContextMenu({ x: e.clientX, y: e.clientY, item })
    },
    [],
  )

  const handleSidebarRename = useCallback(
    async (item: SidebarContextItem) => {
      setSidebarContextMenu(null)
      const newName = window.prompt(
        item.kind === 'project' ? 'Rename project' : 'Rename module',
        item.label,
      )
      if (newName == null || !newName.trim()) return
      const trim = newName.trim()
      const previousName = item.label

      const applyOptimistic = (name: string) => {
        setProjects((prev) =>
          prev.map((p) => {
            if (item.kind === 'project') {
              if (p.id === item.id) return { ...p, name }
              return p
            }
            const hasModule = p.modules.some((m) => m.id === item.id)
            if (!hasModule) return p
            return {
              ...p,
              modules: p.modules.map((m) =>
                m.id === item.id ? { ...m, name } : m,
              ),
            }
          }),
        )
      }

      applyOptimistic(trim)

      try {
        if (item.kind === 'project') {
          const res = await fetch(`/api/projects/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trim }),
          })
          if (!res.ok) throw new Error('Failed to rename')
        } else {
          const res = await fetch(`/api/modules/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trim }),
          })
          if (!res.ok) throw new Error('Failed to rename')
        }
        await fetchProjects()
      } catch {
        applyOptimistic(previousName)
        window.alert('Failed to rename')
      }
    },
    [fetchProjects, setProjects],
  )

  const handleSidebarDelete = useCallback(
    async (item: SidebarContextItem) => {
      setSidebarContextMenu(null)
      const pathSegments = pathname.split('/')
      const currentProjectId =
        pathname.startsWith('/dashboard/') ? pathSegments[2] ?? null : null
      const currentModuleId =
        pathSegments[3] === 'module' ? pathSegments[4] ?? null : null

      const message =
        item.kind === 'project'
          ? `Delete project "${item.label}"? This will remove the project and all its modules and trackers.`
          : `Delete module "${item.label}"? Trackers inside will remain in the project.`
      if (!window.confirm(message)) return
      try {
        if (item.kind === 'project') {
          const res = await fetch(`/api/projects/${item.id}`, {
            method: 'DELETE',
          })
          if (!res.ok) throw new Error('Failed to delete')
          await fetchProjects()
          if (currentProjectId === item.id) router.replace('/dashboard')
        } else {
          const res = await fetch(`/api/modules/${item.id}`, {
            method: 'DELETE',
          })
          if (!res.ok) throw new Error('Failed to delete')
          await fetchProjects()
          if (
            currentProjectId === pathSegments[2] &&
            currentModuleId === item.id
          ) {
            router.replace(`/dashboard/${currentProjectId}`)
          }
        }
      } catch {
        window.alert('Failed to delete')
      }
    },
    [pathname, fetchProjects, router],
  )

  const totalTrackers = projects.reduce(
    (acc, p) => acc + (p.trackerSchemas?.length ?? 0),
    0
  )
  const lastActivity =
    projects.length > 0
      ? projects
          .flatMap((p) =>
            (p.trackerSchemas ?? []).map((t) => ({
              date: t.updatedAt,
              name: p.name,
            }))
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0]
      : null
  const isDesktop = pathname === '/dashboard'
  const pathSegments = pathname.split('/')
  const currentProjectId = pathname.startsWith('/dashboard/')
    ? pathSegments[2] ?? null
    : null
  const currentModuleId =
    pathSegments[3] === 'module' ? pathSegments[4] ?? null : null

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
    <div className="fixed inset-0 bg-background text-foreground overflow-hidden flex flex-col font-sans select-none">
      {sidebarContextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[100] min-w-[160px] rounded-lg border bg-popover text-popover-foreground shadow-md py-1 animate-in fade-in-0 zoom-in-95"
            style={{
              left: sidebarContextMenu.x,
              top: sidebarContextMenu.y,
            }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80"
              onClick={() => handleSidebarRename(sidebarContextMenu.item)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 text-destructive"
              onClick={() => handleSidebarDelete(sidebarContextMenu.item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}
      <div className="flex flex-1 min-h-0">
        <aside
          className={cn(
            'flex-shrink-0 border-r border-border/50 flex flex-col bg-muted/20 transition-[width] duration-200',
            sidebarCollapsed ? 'w-12' : 'w-52'
          )}
        >
          <div className="p-2 flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <Link
                href="/dashboard"
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors flex-1 min-w-0',
                  isDesktop
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-xs truncate">Dashboard</span>
                )}
              </Link>
              {!sidebarCollapsed && (
                <Link
                  href="/"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="Go to landing page"
                >
                  <Activity className="h-4 w-4" />
                </Link>
              )}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Project
                </div>
                {projects.map((project) => (
                  <SidebarProject
                    key={project.id}
                    project={project}
                    currentProjectId={currentProjectId}
                    currentModuleId={currentModuleId}
                    onContextMenu={openSidebarContextMenu}
                  />
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

export function DashboardLayoutClient({
  children,
  initialProjects,
}: {
  children: React.ReactNode
  initialProjects: Project[] | null
}) {
  return (
    <QueryClientProviderWrapper>
      <DashboardProvider initialProjects={initialProjects}>
        <DashboardShell>{children}</DashboardShell>
      </DashboardProvider>
    </QueryClientProviderWrapper>
  )
}
