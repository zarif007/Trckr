'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createPortal } from 'react-dom'
import {
  Loader2,
  Monitor,
  Menu,
  X,
  FolderOpen,
  Folder,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  FileText,
  LayoutList,
  Link2,
  ShieldCheck,
  FunctionSquare,
  GitBranch,
} from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DashboardProvider,
  useDashboard,
  collectTrackersFromModules,
  type Project,
  type Module,
  type TrackerSchema,
} from '../../dashboard-context'
import { QueryClientProviderWrapper } from './QueryClientProviderWrapper'
import { ClaiProvider } from '../clai'

type SidebarContextItem =
  | { kind: 'project'; id: string; label: string }
  | { kind: 'module'; id: string; label: string }
  | {
    kind: 'tracker'; id: string; label: string; trackerHrefs: {
      trackerPageHref: string
      schemaEditHref: string
      listHref: string | null
      bindingsHref: string
      validationsHref: string
      calculationsHref: string
      dependsOnHref: string
    }
  }

function getTrackerDisplayName(name: string | null, isList: boolean): string {
  if (!name) return isList ? 'Untitled list' : 'Untitled tracker'
  if (isList && name.endsWith('.list')) return name.slice(0, -5)
  return name
}

function moduleContainsActive(
  mod: Module,
  currentModuleId: string | null,
  currentTrackerId: string | null,
): boolean {
  if (currentModuleId === mod.id) return true
  if (
    currentTrackerId != null &&
    (mod.trackerSchemas?.some((t) => t.id === currentTrackerId) ?? false)
  )
    return true
  return (mod.children ?? []).some((c) =>
    moduleContainsActive(c, currentModuleId, currentTrackerId),
  )
}

function updateModuleInTree(
  modules: Module[],
  id: string,
  upd: (m: Module) => Module,
): Module[] {
  return modules.map((m) =>
    m.id === id ? upd(m) : { ...m, children: updateModuleInTree(m.children, id, upd) },
  )
}

/**
 * Renders a single tracker link in the sidebar.
 * All trackers (single, multi, version controlled) use the same FileText icon.
 * List companions (listForSchemaId != null) use LayoutList icon.
 */
function buildTrackerHrefs(tracker: TrackerSchema) {
  const parentId = tracker.listForSchemaId ?? tracker.id
  const isList = tracker.listForSchemaId != null
  return {
    trackerPageHref: `/tracker/${parentId}`,
    schemaEditHref: `/tracker/${parentId}/edit`,
    listHref: isList ? `/tracker-list/${tracker.id}` : (tracker.instance === 'MULTI' ? `/tracker-list/${tracker.id}` : null),
    bindingsHref: `/tracker/${parentId}/bindings`,
    validationsHref: `/tracker/${parentId}/validations`,
    calculationsHref: `/tracker/${parentId}/calculations`,
    dependsOnHref: `/tracker/${parentId}/depends-on`,
  }
}

function SidebarTrackerLink({
  tracker,
  currentTrackerId,
  indent = false,
  onContextMenu,
}: {
  tracker: TrackerSchema
  currentTrackerId: string | null
  indent?: boolean
  onContextMenu?: (e: React.MouseEvent, item: SidebarContextItem) => void
}) {
  const isList = tracker.listForSchemaId != null
  const isActive = tracker.id === currentTrackerId
  const parentTrackerId = isList ? tracker.listForSchemaId : tracker.id
  const fallbackHref = isList ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`
  const dataHref = parentTrackerId ? `/tracker/${parentTrackerId}` : fallbackHref

  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', indent && 'pl-1.5')}>
      <span className="group/icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
        {isList ? <LayoutList className="h-[18px] w-[18px]" /> : <FileText className="h-[18px] w-[18px]" />}
      </span>
      <Link
        href={dataHref}
        className={cn(
          'flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-md text-left transition-colors min-w-0 flex-1 overflow-hidden group/item',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
        onContextMenu={
          onContextMenu
            ? (e) =>
              onContextMenu(e, {
                kind: 'tracker',
                id: tracker.id,
                label: getTrackerDisplayName(tracker.name, isList),
                trackerHrefs: buildTrackerHrefs(tracker),
              })
            : undefined
        }
      >
        <span className="text-sm leading-5 truncate flex-1 min-w-0">
          {getTrackerDisplayName(tracker.name, isList)}
        </span>
        <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity duration-150 group-hover/item:opacity-70" />
      </Link>
    </div>
  )
}

/**
 * Renders a tracker (and its .list companion, if any) in the sidebar.
 * Companion appears directly under the parent tracker with aligned icons.
 */
function SidebarTrackerGroup({
  tracker,
  listCompanion,
  currentTrackerId,
  onContextMenu,
}: {
  tracker: TrackerSchema
  listCompanion?: TrackerSchema
  currentTrackerId: string | null
  onContextMenu?: (e: React.MouseEvent, item: SidebarContextItem) => void
}) {
  return (
    <>
      <SidebarTrackerLink
        tracker={tracker}
        currentTrackerId={currentTrackerId}
        onContextMenu={onContextMenu}
      />
      {listCompanion && (
        <SidebarTrackerLink
          tracker={listCompanion}
          currentTrackerId={currentTrackerId}
          onContextMenu={onContextMenu}
        />
      )}
    </>
  )
}

/**
 * Given a flat list of tracker schemas, group root trackers with their .list companions.
 * Returns an array of { tracker, listCompanion? } pairs.
 * List companions that are orphaned (parent not in list) are shown as standalone.
 */
function groupTrackers(trackers: TrackerSchema[]): Array<{ tracker: TrackerSchema; listCompanion?: TrackerSchema }> {
  const byId = new Map(trackers.map((t) => [t.id, t]))
  const listCompanions = new Set(trackers.filter((t) => t.listForSchemaId != null).map((t) => t.id))

  const result: Array<{ tracker: TrackerSchema; listCompanion?: TrackerSchema }> = []

  for (const tracker of trackers) {
    // Skip list companions — they're attached to their parent below
    if (listCompanions.has(tracker.id)) continue

    // Find the list companion for this tracker (if any)
    const companion = trackers.find((t) => t.listForSchemaId === tracker.id)

    result.push({ tracker, listCompanion: companion })
  }

  // Add any orphaned list companions whose parents aren't in this list
  for (const tracker of trackers) {
    if (!listCompanions.has(tracker.id)) continue
    if (tracker.listForSchemaId && byId.has(tracker.listForSchemaId)) continue
    result.push({ tracker })
  }

  return result
}

function SidebarModule({
  projectId,
  module: mod,
  currentProjectId,
  currentModuleId,
  currentTrackerId,
  onContextMenu,
}: {
  projectId: string
  module: Module
  currentProjectId: string | null
  currentModuleId: string | null
  currentTrackerId: string | null
  onContextMenu: (e: React.MouseEvent, item: SidebarContextItem) => void
}) {
  const isModuleActive =
    projectId === currentProjectId && mod.id === currentModuleId
  const trackers = mod.trackerSchemas ?? []
  const children = mod.children ?? []
  const hasTrackers = trackers.length > 0
  const hasChildModules = children.length > 0
  const hasExpandableContent = hasTrackers || hasChildModules
  const containsActive =
    isModuleActive || moduleContainsActive(mod, currentModuleId, currentTrackerId)
  const [expanded, setExpanded] = useState(
    containsActive || (hasExpandableContent && isModuleActive),
  )

  useEffect(() => {
    if (containsActive && hasExpandableContent) setExpanded(true)
  }, [containsActive, hasExpandableContent])

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="group/icon relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
          <Folder className="h-[18px] w-[18px] opacity-75 transition-opacity duration-150 group-hover/icon:opacity-0" />
          {hasExpandableContent ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/icon:opacity-80"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
            </button>
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/icon:opacity-70"
              aria-hidden
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </span>
        <Link
          href={`/dashboard/${projectId}/module/${mod.id}`}
          className={cn(
            'flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-md text-left transition-colors min-w-0 flex-1 overflow-hidden',
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
          <span className="text-sm leading-5 truncate flex-1 min-w-0">
            {mod.name || 'Untitled module'}
          </span>
          {(trackers.length > 0 || children.length > 0) && (
            <span className="text-xs text-muted-foreground/60 tabular-nums flex-shrink-0 w-9 text-right ml-auto">
              {trackers.length + children.length}
            </span>
          )}
        </Link>
      </div>
      {expanded && hasExpandableContent && (
        <div className="pl-1.5 mt-0.5 flex flex-col gap-0.5 min-w-0">
          {children.map((child) => (
            <SidebarModule
              key={child.id}
              projectId={projectId}
              module={child}
              currentProjectId={currentProjectId}
              currentModuleId={currentModuleId}
              currentTrackerId={currentTrackerId}
              onContextMenu={onContextMenu}
            />
          ))}
          {groupTrackers(trackers).map(({ tracker, listCompanion }) => (
            <SidebarTrackerGroup
              key={tracker.id}
              tracker={tracker}
              listCompanion={listCompanion}
              currentTrackerId={currentTrackerId}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarProject({
  project,
  currentProjectId,
  currentModuleId,
  currentTrackerId,
  onContextMenu,
}: {
  project: Project
  currentProjectId: string | null
  currentModuleId: string | null
  currentTrackerId: string | null
  onContextMenu: (e: React.MouseEvent, item: SidebarContextItem) => void
}) {
  const isActive = project.id === currentProjectId && !currentModuleId
  const projectLevelTrackers = (project.trackerSchemas ?? []).filter(
    (t) => !t.moduleId
  )
  const hasModules = project.modules.length > 0
  const hasProjectTrackers = projectLevelTrackers.length > 0
  const hasChildren = hasModules || hasProjectTrackers
  const containsActive = project.id === currentProjectId
  const [expanded, setExpanded] = useState(containsActive && hasChildren)

  useEffect(() => {
    if (containsActive && hasChildren) setExpanded(true)
  }, [containsActive, hasChildren])

  const itemCount =
    projectLevelTrackers.length +
    project.modules.length +
    (project.projectFiles?.length ?? 0)

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="group/icon relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
          <FolderOpen className="h-[18px] w-[18px] opacity-75 transition-opacity duration-150 group-hover/icon:opacity-0" />
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/icon:opacity-80"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
            </button>
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/icon:opacity-70"
              aria-hidden
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </span>
        <Link
          href={`/dashboard/${project.id}`}
          className={cn(
            'flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-md text-left transition-colors min-w-0 flex-1 overflow-hidden',
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
          <span className="text-sm leading-5 truncate flex-1 min-w-0">
            {project.name || 'Untitled folder'}
          </span>
          {itemCount > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums flex-shrink-0 w-9 text-right ml-auto">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
      {expanded && (
        <div className="pl-1.5 mt-0.5 flex flex-col gap-0.5 min-w-0">
          {project.modules.map((mod) => (
            <SidebarModule
              key={mod.id}
              projectId={project.id}
              module={mod}
              currentProjectId={currentProjectId}
              currentModuleId={currentModuleId}
              currentTrackerId={currentTrackerId}
              onContextMenu={onContextMenu}
            />
          ))}
          {groupTrackers(projectLevelTrackers).map(({ tracker, listCompanion }) => (
            <SidebarTrackerGroup
              key={tracker.id}
              tracker={tracker}
              listCompanion={listCompanion}
              currentTrackerId={currentTrackerId}
              onContextMenu={onContextMenu}
            />
          ))}
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
            return {
              ...p,
              modules: updateModuleInTree(p.modules, item.id, (m) => ({ ...m, name })),
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
    (acc, p) =>
      acc +
      (p.trackerSchemas?.length ?? 0) +
      collectTrackersFromModules(p.modules ?? []).length,
    0,
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
  const pathSegments = pathname.split('/')
  const currentProjectId = pathname.startsWith('/dashboard/')
    ? pathSegments[2] ?? null
    : null
  const currentModuleId =
    pathSegments[3] === 'module' ? pathSegments[4] ?? null : null
  const isTrackerDetail = pathname.startsWith('/tracker/')
  const isTrackerList = pathname.startsWith('/tracker-list/')
  const currentTrackerId =
    (isTrackerDetail || isTrackerList) && pathSegments[2] ? pathSegments[2] : null

  const allTrackers = projects.flatMap((p) => [
    ...(p.trackerSchemas ?? []),
    ...collectTrackersFromModules(p.modules ?? []),
  ])
  const trackersById = new Map(allTrackers.map((t) => [t.id, t]))
  const recentTrackers: TrackerSchema[] = [...trackersById.values()]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5)

  const [projectSectionOpen, setProjectSectionOpen] = useState(true)
  const [recentSectionOpen, setRecentSectionOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  const isProjectsPage = pathname === '/dashboard/projects'
  const isRecentsPage = pathname === '/dashboard/recents'
  const isDashboardHome = pathname === '/dashboard' || pathname === '/dashboard/'

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
            className="fixed z-[100] min-w-[192px] rounded-lg border bg-popover text-popover-foreground shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
            style={{
              left: sidebarContextMenu.x,
              top: sidebarContextMenu.y,
            }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContextMenu.item.kind === 'tracker' ? (() => {
              const { trackerHrefs: hrefs } = sidebarContextMenu.item
              const linkCls = 'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/80 rounded-sm transition-colors'
              const sectionCls = 'px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground select-none'
              return (
                <>
                  <div className="px-3 pb-2 pt-1.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-medium truncate">{sidebarContextMenu.item.label}</span>
                        <span className="text-[10px] text-muted-foreground/70">Tracker</span>
                      </div>
                    </div>
                  </div>
                  <div className={sectionCls}>Navigate</div>
                  <Link href={hrefs.trackerPageHref} className={linkCls} role="menuitem">
                    <FileText className="h-3.5 w-3.5" /> Open Tracker
                  </Link>
                  <Link href={hrefs.schemaEditHref} className={linkCls} role="menuitem">
                    <Pencil className="h-3.5 w-3.5" /> Edit Schema
                  </Link>
                  {hrefs.listHref && (
                    <Link href={hrefs.listHref} className={linkCls} role="menuitem">
                      <LayoutList className="h-3.5 w-3.5" /> View List
                    </Link>
                  )}
                  <div className="my-1 mx-2 h-px bg-border/60" />
                  <div className={sectionCls}>Configure</div>
                  <Link href={hrefs.bindingsHref} className={linkCls} role="menuitem">
                    <Link2 className="h-3.5 w-3.5" /> Bindings
                  </Link>
                  <Link href={hrefs.validationsHref} className={linkCls} role="menuitem">
                    <ShieldCheck className="h-3.5 w-3.5" /> Validations
                  </Link>
                  <Link href={hrefs.calculationsHref} className={linkCls} role="menuitem">
                    <FunctionSquare className="h-3.5 w-3.5" /> Calculations
                  </Link>
                  <Link href={hrefs.dependsOnHref} className={linkCls} role="menuitem">
                    <GitBranch className="h-3.5 w-3.5" /> Depends On
                  </Link>
                </>
              )
            })() : (
              <>
                <div className="px-3 pb-2 pt-1.5 border-b border-border/60">
                  <div className="flex items-center gap-2 group">
                    <span className="relative inline-flex h-5 w-5 items-center justify-center text-muted-foreground">
                      {sidebarContextMenu.item.kind === 'project' ? (
                        <>
                          <FolderOpen className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                          <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                        </>
                      ) : (
                        <>
                          <Folder className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                          <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                        </>
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium truncate">
                        {sidebarContextMenu.item.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {sidebarContextMenu.item.kind === 'project' ? 'Project' : 'Module'}
                      </span>
                    </div>
                  </div>
                </div>
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
              </>
            )}
          </div>,
          document.body,
        )}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground hover:bg-background"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity duration-200',
          mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!mobileSidebarOpen}
      >
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="absolute inset-0 bg-background/50 backdrop-blur-[1px]"
          aria-label="Close sidebar"
        />
        <aside
          className={cn(
            'absolute left-0 top-0 h-full w-[min(88vw,340px)] border-r border-border/60 bg-background transition-transform duration-200',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar navigation"
        >
          <div className="flex h-full flex-col min-h-0 min-w-0">
            <div className="flex items-center justify-between border-b border-border/50 px-2 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Navigation
              </span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 p-2 min-w-0">
              <Link
                href="/"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                aria-label="Go to home"
              >
                <span className="flex h-6 w-6 items-center justify-center [&_svg]:h-6 [&_svg]:w-6" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-current"
                  >
                    <path d="M12 3L20 7.5L12 12L4 7.5L12 3Z" fill="currentColor" className="opacity-100" />
                    <path d="M12 12L20 7.5V16.5L12 21V12Z" fill="currentColor" className="opacity-70" />
                    <path d="M12 12L4 7.5V16.5L12 21V12Z" fill="currentColor" className="opacity-40" />
                  </svg>
                </span>
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  'flex items-center px-2.5 py-2 rounded-lg text-left transition-colors flex-1 min-w-0',
                  isDashboardHome
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span className="text-sm truncate">Dashboard</span>
              </Link>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 pt-1 flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1 min-w-0 group">
                <button
                  type="button"
                  onClick={() => setProjectSectionOpen((v) => !v)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-opacity"
                >
                  <span className="relative inline-flex h-4 w-4 items-center justify-center">
                    <Folder className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                    <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                  </span>
                </button>
                <Link
                  href="/dashboard/projects"
                  className={cn(
                    'flex-1 min-w-0 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md truncate',
                    isProjectsPage
                      ? 'text-primary'
                      : 'text-muted-foreground/70 hover:text-muted-foreground',
                  )}
                >
                  Projects
                </Link>
              </div>
              {projectSectionOpen &&
                projects.map((project) => (
                  <SidebarProject
                    key={project.id}
                    project={project}
                    currentProjectId={currentProjectId}
                    currentModuleId={currentModuleId}
                    currentTrackerId={currentTrackerId}
                    onContextMenu={openSidebarContextMenu}
                  />
                ))}
              <div className="flex items-center gap-1 min-w-0 mt-2 group">
                <button
                  type="button"
                  onClick={() => setRecentSectionOpen((v) => !v)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-opacity"
                >
                  <span className="relative inline-flex h-4 w-4 items-center justify-center">
                    <LayoutList className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                    <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                  </span>
                </button>
                <Link
                  href="/dashboard/recents"
                  className={cn(
                    'flex-1 min-w-0 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md truncate',
                    isRecentsPage
                      ? 'text-primary'
                      : 'text-muted-foreground/70 hover:text-muted-foreground',
                  )}
                >
                  Recent
                </Link>
              </div>
              {recentSectionOpen && recentTrackers.length > 0 && (
                <div className="flex flex-col gap-0.5 min-w-0 pl-1.5">
                  {recentTrackers.map((tracker) => (
                    <SidebarTrackerLink
                      key={tracker.id}
                      tracker={tracker}
                      currentTrackerId={currentTrackerId}
                      onContextMenu={openSidebarContextMenu}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border/50 p-2 bg-background/50">
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/30">
                <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    This PC
                  </p>
                  <p className="text-xs text-foreground/80 tabular-nums truncate">
                    {projects.length} folders · {totalTrackers} trackers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <div className="md:hidden flex-1 min-h-0 min-w-0 flex flex-col">
        {children}
      </div>
      <div className="hidden md:flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {sidebarCollapsed ? (
          <>
            <aside
              className={cn(
                'flex-shrink-0 w-12 border-r border-border/50 flex flex-col bg-muted/20 transition-[width] duration-200',
              )}
            >
              <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
                <div className="flex-shrink-0 flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <Link
                      href="/"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      aria-label="Go to home"
                    >
                      <span className="flex h-6 w-6 items-center justify-center [&_svg]:h-6 [&_svg]:w-6" aria-hidden>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-current"
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
                      </span>
                    </Link>
                    <Link
                      href="/dashboard"
                      className={cn(
                        'flex items-center px-2.5 py-2 rounded-lg text-left transition-colors flex-1 min-w-0',
                        isDashboardHome
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      {sidebarCollapsed ? (
                        <span className="text-xs font-medium w-6 text-center">D</span>
                      ) : (
                        <span className="text-xs truncate">Dashboard</span>
                      )}
                    </Link>
                  </div>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 pt-0 flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1 min-w-0 group">
                      <button
                        type="button"
                        onClick={() => setProjectSectionOpen((v) => !v)}
                        className="w-[18px] h-[18px] flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-opacity"
                      >
                        <span className="relative inline-flex h-4 w-4 items-center justify-center">
                          <Folder className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                          <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                        </span>
                      </button>
                      <Link
                        href="/dashboard/projects"
                        className={cn(
                          'flex-1 min-w-0 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md truncate',
                          isProjectsPage
                            ? 'text-primary'
                            : 'text-muted-foreground/70 hover:text-muted-foreground'
                        )}
                      >
                        Projects
                      </Link>
                    </div>
                    {projectSectionOpen &&
                      projects.map((project) => (
                        <SidebarProject
                          key={project.id}
                          project={project}
                          currentProjectId={currentProjectId}
                          currentModuleId={currentModuleId}
                          currentTrackerId={currentTrackerId}
                          onContextMenu={openSidebarContextMenu}
                        />
                      ))}
                    <div className="flex items-center gap-1 min-w-0 mt-2 group">
                      <button
                        type="button"
                        onClick={() => setRecentSectionOpen((v) => !v)}
                        className="w-[18px] h-[18px] flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-opacity"
                      >
                        <span className="relative inline-flex h-4 w-4 items-center justify-center">
                          <LayoutList className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                          <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                        </span>
                      </button>
                      <Link
                        href="/dashboard/recents"
                        className={cn(
                          'flex-1 min-w-0 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md truncate',
                          isRecentsPage
                            ? 'text-primary'
                            : 'text-muted-foreground/70 hover:text-muted-foreground'
                        )}
                      >
                        Recent
                      </Link>
                    </div>
                    {recentSectionOpen && recentTrackers.length > 0 && (
                      <div className="flex flex-col gap-0.5 min-w-0 pl-1.5">
                        {recentTrackers.map((tracker) => (
                          <SidebarTrackerLink
                            key={tracker.id}
                            tracker={tracker}
                            currentTrackerId={currentTrackerId}
                            onContextMenu={openSidebarContextMenu}
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        This PC
                      </p>
                      <p className="text-xs text-foreground/80 tabular-nums truncate">
                        {projects.length} folders · {totalTrackers} trackers
                      </p>
                      {lastActivity && (
                        <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
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
          </>
        ) : (
          <div className="flex-1 min-h-0 min-w-0 flex flex-col">
            <Group
              orientation="horizontal"
              className="flex-1 min-h-0"
              id="dashboard-sidebar"
              style={{ flex: 1, minHeight: 0 }}
            >
              <Panel
                id="dashboard-sidebar-panel"
                defaultSize="10"
                minSize="12"
                maxSize="30"
                className="flex flex-col min-h-0"
              >
                <aside className="h-full w-full flex flex-col border-r border-border/50 bg-muted/20 min-w-0 overflow-hidden">
                  <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
                    <div className="flex-shrink-0 flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <Link
                          href="/"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                          aria-label="Go to home"
                        >
                          <span className="flex h-6 w-6 items-center justify-center [&_svg]:h-6 [&_svg]:w-6" aria-hidden>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-current"
                            >
                              <path d="M12 3L20 7.5L12 12L4 7.5L12 3Z" fill="currentColor" className="opacity-100" />
                              <path d="M12 12L20 7.5V16.5L12 21V12Z" fill="currentColor" className="opacity-70" />
                              <path d="M12 12L4 7.5V16.5L12 21V12Z" fill="currentColor" className="opacity-40" />
                            </svg>
                          </span>
                        </Link>
                        <Link
                          href="/dashboard"
                          className={cn(
                            'flex items-center px-2.5 py-2 rounded-lg text-left transition-colors flex-1 min-w-0',
                            isDashboardHome
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                          )}
                        >
                          <span className="text-sm truncate">Dashboard</span>
                        </Link>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 pt-0 flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1 min-w-0 group">
                        <button
                          type="button"
                          onClick={() => setProjectSectionOpen((v) => !v)}
                          className="w-[18px] h-[18px] flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-opacity"
                        >
                          <span className="relative inline-flex h-4 w-4 items-center justify-center">
                            <Folder className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                            <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                          </span>
                        </button>
                        <Link
                          href="/dashboard/projects"
                          className={cn(
                            'flex-1 min-w-0 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md truncate',
                            isProjectsPage
                              ? 'text-primary'
                              : 'text-muted-foreground/70 hover:text-muted-foreground',
                          )}
                        >
                          Projects
                        </Link>
                      </div>
                      {projectSectionOpen &&
                        projects.map((project) => (
                          <SidebarProject
                            key={project.id}
                            project={project}
                            currentProjectId={currentProjectId}
                            currentModuleId={currentModuleId}
                            currentTrackerId={currentTrackerId}
                            onContextMenu={openSidebarContextMenu}
                          />
                        ))}
                      <div className="flex items-center gap-1 min-w-0 mt-2 group">
                        <button
                          type="button"
                          onClick={() => setRecentSectionOpen((v) => !v)}
                          className="w-[18px] h-[18px] flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-opacity"
                        >
                          <span className="relative inline-flex h-4 w-4 items-center justify-center">
                            <LayoutList className="h-4 w-4 opacity-80 transition-opacity duration-150 group-hover:opacity-0" />
                            <ChevronRight className="absolute h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-90" />
                          </span>
                        </button>
                        <Link
                          href="/dashboard/recents"
                          className={cn(
                            'flex-1 min-w-0 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md truncate',
                            isRecentsPage
                              ? 'text-primary'
                              : 'text-muted-foreground/70 hover:text-muted-foreground',
                          )}
                        >
                          Recent
                        </Link>
                      </div>
                      {recentSectionOpen && recentTrackers.length > 0 && (
                        <div className="flex flex-col gap-0.5 min-w-0 pl-1.5">
                          {recentTrackers.map((tracker) => (
                            <SidebarTrackerLink
                              key={tracker.id}
                              tracker={tracker}
                              currentTrackerId={currentTrackerId}
                              onContextMenu={openSidebarContextMenu}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-border/50 p-2 bg-background/50">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30">
                      <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          This PC
                        </p>
                        <p className="text-xs text-foreground/80 tabular-nums truncate">
                          {projects.length} folders · {totalTrackers} trackers
                        </p>
                        {lastActivity && (
                          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                            Last:{' '}
                            {new Date(lastActivity.date).toLocaleDateString(
                              undefined,
                              { month: 'short', day: 'numeric' },
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="mt-1 w-full flex justify-end p-1 rounded hover:bg-muted/60 text-muted-foreground"
                      aria-label="Collapse sidebar"
                    >
                      <ChevronDown className="h-3.5 w-3.5 rotate-[270deg]" />
                    </button>
                  </div>
                </aside>
              </Panel>
              <Separator
                className="shrink-0 w-1 bg-border/50 hover:bg-border active:bg-primary/30 transition-colors cursor-col-resize flex items-stretch"
                style={{ minWidth: 6 }}
              />
              <Panel id="dashboard-main-panel" defaultSize="90" minSize="70" className="flex flex-col min-w-0 min-h-0">
                {children}
              </Panel>
            </Group>
          </div>
        )}
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
        <ClaiProvider>
          <DashboardShell>{children}</DashboardShell>
        </ClaiProvider>
      </DashboardProvider>
    </QueryClientProviderWrapper>
  )
}
