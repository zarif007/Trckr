'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FolderOpen,
  Loader2,
  X,
  FolderPlus,
  ExternalLink,
  LayoutGrid,
  List,
  LayoutList,
  Table2,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { useDashboard, collectTrackersFromModules } from './dashboard-context'
import { DashboardHomeSkeleton } from './components/skeleton/DashboardPageSkeleton'
import { CreateDropdown } from './components/CreateDropdown'

export type DashboardView = 'all' | 'projects' | 'recents'

const DASH_GRID_ICON_SHELL =
  'relative w-14 h-14 rounded-md bg-muted/45 border border-border/40 shadow-sm flex items-center justify-center transition-all duration-200 group-hover:border-primary/35 group-hover:bg-primary/8 group-hover:shadow-md'
const DASH_GRID_ICON = 'h-7 w-7 text-foreground/75 transition-all duration-200 group-hover:text-primary'
const DASH_LIST_ICON_SHELL =
  'w-11 h-11 rounded-md bg-muted/45 border border-border/40 flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-primary/35 group-hover:bg-primary/8'
const DASH_LIST_ICON = 'h-5 w-5 text-foreground/75 transition-colors group-hover:text-primary'

const DASH_LIST_ROW =
  'flex items-center gap-3 px-3 py-2.5 rounded-md border border-border/35 bg-background/50 shadow-sm hover:border-border/50 hover:bg-muted/40 hover:shadow-md cursor-pointer transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function getTrackerDisplayName(name: string | null, isList: boolean): string {
  if (!name) return isList ? 'Untitled list' : 'Untitled tracker'
  if (isList && name.endsWith('.list')) return name.slice(0, -5)
  return name
}

export function DashboardPageContent({ view = 'all' }: { view?: DashboardView }) {
  const router = useRouter()
  const { projects, projectsLoading, fetchProjects } = useDashboard()
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const createProjectInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (createProjectOpen) {
      setProjectName('')
      requestAnimationFrame(() => createProjectInputRef.current?.focus())
    }
  }, [createProjectOpen])

  const handleOpenCreateProject = useCallback(() => {
    setCreateProjectOpen(true)
  }, [])

  const handleCreateProject = useCallback(
    async (nameOverride?: string) => {
      const name =
        (nameOverride ?? projectName).trim() || 'New Project'
      setCreating(true)
      setError(null)
      setCreateProjectOpen(false)
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error('Failed to create project')
        await fetchProjects()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error creating project')
      } finally {
        setCreating(false)
      }
    },
    [projectName, fetchProjects],
  )

  const handleCreateProjectKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreateProject(e.currentTarget.value)
      }
    },
    [handleCreateProject],
  )

  const allTrackers = projects.flatMap((p) => [
    ...(p.trackerSchemas ?? []).filter((t) => t.type === 'GENERAL'),
    ...collectTrackersFromModules(p.modules ?? []),
  ])
  const trackersById = new Map(allTrackers.map((t) => [t.id, t]))
  const uniqueTrackers = [...trackersById.values()]
  const totalTrackers = uniqueTrackers.length
  const recentTrackers = uniqueTrackers
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5)

  if (projectsLoading) {
    return <DashboardHomeSkeleton />
  }

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
        <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-3 gap-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {view !== 'recents' && (
              <div
                className="flex rounded-md border border-border/45 bg-muted/25 p-0.5 shadow-sm"
                role="group"
                aria-label="Layout"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'rounded-sm px-1.5 py-1 transition-all',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'rounded-sm px-1.5 py-1 transition-all',
                    viewMode === 'list'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/ai-project"
              className="group relative rounded-md"
            >
              <span className="absolute -inset-0.5 rounded-md ai-gradient-border opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="relative h-7 px-2.5 rounded-md bg-background/90 border border-border/40 shadow-sm flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90 group-hover:text-foreground transition-colors">
                <Sparkles className="h-3.5 w-3.5 text-foreground/80 group-hover:text-foreground" />
                AI Project (Alpha)
              </span>
            </Link>
            <CreateDropdown
              variant="toolbar"
              onError={setError}
              onCreateProjectClick={view !== 'recents' ? handleOpenCreateProject : undefined}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-3 sm:px-4 py-6">
          {(view === 'all' || view === 'projects') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className={cn(
                view === 'projects' && 'h-full',
                viewMode === 'grid'
                  ? 'grid w-full grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-4 content-start'
                  : 'flex flex-col gap-1'
              )}
            >
              {viewMode === 'grid' ? (
                <>
                  {projects.map((project) => {
                    const projectTrackerCount = (project.trackerSchemas ?? []).filter(
                      (t) => t.type === 'GENERAL',
                    ).length
                    return (
                      <Link
                        key={project.id}
                        href={`/project/${project.id}`}
                        className="min-w-0 w-full"
                      >
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className="flex flex-col items-center gap-2 p-3 rounded-md border border-border/40 bg-background/60 hover:border-primary/35 hover:bg-primary/[0.06] cursor-pointer transition-[border-color,box-shadow,background-color] duration-150 group shadow-sm hover:shadow-md"
                        >
                          <div className={DASH_GRID_ICON_SHELL}>
                            <FolderOpen className={DASH_GRID_ICON} />
                            {projectTrackerCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[1rem] h-4 px-1 flex items-center justify-center">
                                {projectTrackerCount}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-center truncate w-full">
                            {project.name || 'Untitled'}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {projectTrackerCount} trackers
                          </span>
                        </motion.div>
                      </Link>
                    )
                  })}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="min-w-0 w-full flex flex-col items-center gap-2 p-3 rounded-md border border-dashed border-border/50 bg-muted/25 hover:border-primary/40 hover:bg-primary/[0.06] cursor-pointer transition-[border-color,box-shadow,background-color] duration-150 shadow-sm hover:shadow-md"
                    onClick={handleOpenCreateProject}
                  >
                    <div className="w-14 h-14 rounded-md border border-dashed border-border/50 bg-muted/25 flex items-center justify-center">
                      {creating ? (
                        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
                      ) : (
                        <FolderPlus className="h-7 w-7 text-muted-foreground/70" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      New Project
                    </span>
                  </motion.div>
                </>
              ) : (
                <>
                  {projects.map((project) => {
                    const projectTrackerCount = (project.trackerSchemas ?? []).filter(
                      (t) => t.type === 'GENERAL',
                    ).length
                    return (
                      <Link
                        key={project.id}
                        href={`/project/${project.id}`}
                        className={DASH_LIST_ROW}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {project.name || 'Untitled project'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {projectTrackerCount} trackers
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(project.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className={DASH_LIST_ICON_SHELL}>
                          <FolderOpen className={DASH_LIST_ICON} />
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )
                  })}
                  <button
                    type="button"
                    onClick={handleOpenCreateProject}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-border/50 bg-muted/15 shadow-sm hover:bg-muted/30 hover:border-primary/35 hover:shadow-md transition-all duration-150 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="w-11 h-11 rounded-md border border-dashed border-border/45 bg-muted/25 flex items-center justify-center flex-shrink-0">
                      {creating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <FolderPlus className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-sm font-medium">New Project</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
          {view === 'all' && recentTrackers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="pt-4 mt-4"
            >
              <div className="rounded-md border border-border/40 bg-muted/10 p-3 sm:p-4 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3 px-0.5">
                  Recent trackers
                </h2>
                <div className="flex flex-col gap-1.5">
                  {recentTrackers.map((tracker) => {
                    const isListView = tracker.listForSchemaId != null
                    const TrackerIcon = isListView ? LayoutList : Table2
                    const href = tracker.listForSchemaId ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`
                    return (
                      <Link
                        key={tracker.id}
                        href={href}
                        className={DASH_LIST_ROW}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold truncate block">
                            {getTrackerDisplayName(tracker.name, tracker.listForSchemaId != null)}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            Updated{' '}
                            {new Date(tracker.updatedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className={`${DASH_LIST_ICON_SHELL} ${isListView ? 'border-primary/35 bg-primary/8' : ''}`}>
                          <TrackerIcon className={`${DASH_LIST_ICON} ${isListView ? 'text-primary/80' : ''}`} />
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
          {view === 'recents' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <div className="rounded-md border border-border/40 bg-muted/10 p-3 sm:p-4 shadow-sm h-full min-h-[8rem] flex flex-col">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/85 mb-3 px-0.5">
                  Recent trackers
                </h2>
                {recentTrackers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-md border border-dashed border-border/45 bg-background/40 py-10 px-4 text-center">
                    <Table2 className="h-8 w-8 text-muted-foreground/35 mb-2" aria-hidden />
                    <p className="text-sm font-medium text-muted-foreground">No trackers yet</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 max-w-[220px]">
                      Open a project and create a tracker to see it here.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {recentTrackers.map((tracker) => {
                      const isListView = tracker.listForSchemaId != null
                      const TrackerIcon = isListView ? LayoutList : Table2
                      const href = tracker.listForSchemaId ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`
                      return (
                        <Link
                          key={tracker.id}
                          href={href}
                          className={DASH_LIST_ROW}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold truncate block">
                              {getTrackerDisplayName(tracker.name, tracker.listForSchemaId != null)}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              Updated{' '}
                              {new Date(tracker.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className={`${DASH_LIST_ICON_SHELL} ${isListView ? 'border-primary/35 bg-primary/8' : ''}`}>
                            <TrackerIcon className={`${DASH_LIST_ICON} ${isListView ? 'text-primary/80' : ''}`} />
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20">
        <span>
          {projects.length} projects · {totalTrackers} trackers
        </span>
        <span className="tabular-nums">
          {currentTime.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent
          showCloseButton={true}
          className={cn(
            'gap-0 overflow-hidden bg-background/95 p-0 shadow-xl backdrop-blur-sm sm:max-w-[380px]',
            theme.radius.md,
            theme.border.subtle
          )}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-4 pt-6 pl-6 pr-12 pb-4">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center border border-primary/10 bg-primary/10 text-primary',
                  theme.radius.md
                )}
              >
                <FolderPlus className="h-5 w-5" />
              </div>
              <DialogHeader className="p-0 gap-1 text-left min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  New project
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground/90">
                  Give your project a name. You can rename it anytime.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 pb-6 space-y-2">
              <label
                htmlFor="create-project-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Project name
              </label>
              <Input
                id="create-project-name"
                ref={createProjectInputRef}
                placeholder="e.g. Marketing site"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={handleCreateProjectKeyDown}
                className={cn(
                  'h-10 bg-muted/30 transition-colors placeholder:text-muted-foreground/60 focus:bg-background',
                  theme.radius.md,
                  theme.border.emphasis
                )}
              />
            </div>
            <DialogFooter
              className={cn(
                'flex-row justify-end gap-2 border-t bg-muted/20 px-6 py-4',
                theme.border.subtleAlt
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-md"
                onClick={() => setCreateProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-md min-w-[72px]"
                onClick={() => handleCreateProject()}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'fixed right-6 bottom-10 z-50 flex items-center gap-2 border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive shadow-lg',
            theme.radius.md
          )}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-md p-0.5 hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </>
  )
}
