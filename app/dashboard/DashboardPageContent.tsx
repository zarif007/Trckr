'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FolderOpen,
  Loader2,
  X,
  FolderPlus,
  FilePlus,
  ExternalLink,
  LayoutGrid,
  List,
  LayoutList,
  FileText,
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
import { useDashboard, collectTrackersFromModules } from './dashboard-context'
import { DashboardHomeSkeleton } from './components/skeleton/DashboardPageSkeleton'

export type DashboardView = 'all' | 'projects' | 'recents'

const DASH_GRID_ICON_SHELL =
  'relative w-14 h-14 rounded-2xl bg-muted/45 border border-border/40 shadow-sm flex items-center justify-center transition-all duration-200 group-hover:border-primary/35 group-hover:bg-primary/8 group-hover:shadow-md'
const DASH_GRID_ICON = 'h-7 w-7 text-foreground/75 transition-all duration-200 group-hover:text-primary'
const DASH_LIST_ICON_SHELL =
  'w-11 h-11 rounded-xl bg-muted/45 border border-border/40 flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-primary/35 group-hover:bg-primary/8'
const DASH_LIST_ICON = 'h-5 w-5 text-foreground/75 transition-colors group-hover:text-primary'

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

  const handleCreateTracker = async (projectId?: string) => {
    setCreating(true)
    setError(null)
    try {
      const body: { new: true; projectId?: string } = { new: true }
      if (projectId?.trim()) body.projectId = projectId.trim()
      const res = await fetch('/api/trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to create tracker')
      const data = (await res.json()) as { id: string }
      router.push(`/tracker/${data.id}/edit?new=true`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating tracker')
    } finally {
      setCreating(false)
    }
  }

  const totalTrackers = projects.reduce(
    (acc, p) =>
      acc +
      (p.trackerSchemas?.length ?? 0) +
      collectTrackersFromModules(p.modules ?? []).length,
    0,
  )

  const allTrackers = projects.flatMap((p) => [
    ...(p.trackerSchemas ?? []),
    ...collectTrackersFromModules(p.modules ?? []),
  ])
  const trackersById = new Map(allTrackers.map((t) => [t.id, t]))
  const recentTrackers = [...trackersById.values()]
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
        <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center px-3 gap-3 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {view !== 'recents' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 rounded-md text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={handleOpenCreateProject}
                disabled={creating}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New Project
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 rounded-md text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => handleCreateTracker()}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FilePlus className="h-3.5 w-3.5" />
              )}
              New Tracker
            </Button>
            {view !== 'recents' && (
              <>
                <div className="w-px h-4 bg-border/60" />
                <div className="flex rounded-md border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-1.5 transition-colors',
                      viewMode === 'grid'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-1.5 transition-colors',
                      viewMode === 'list'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-6">
          {(view === 'all' || view === 'projects') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className={cn(
                view === 'projects' && 'h-full',
                viewMode === 'grid'
                  ? 'flex flex-wrap gap-4 content-start'
                  : 'flex flex-col gap-1'
              )}
            >
              {viewMode === 'grid' ? (
                <>
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/${project.id}`}
                      className="min-w-[90px] flex-[1_1_90px] max-w-[calc(20%-0.75rem)]"
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-150 group shadow-sm hover:shadow-md"
                      >
                        <div className={DASH_GRID_ICON_SHELL}>
                          <FolderOpen className={DASH_GRID_ICON} />
                          {project.trackerSchemas.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[1rem] h-4 px-1 flex items-center justify-center">
                              {project.trackerSchemas.length}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-center truncate w-full">
                          {project.name || 'Untitled'}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {project.trackerSchemas.length} trackers
                        </span>
                      </motion.div>
                    </Link>
                  ))}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="min-w-[90px] flex-[1_1_90px] max-w-[calc(20%-0.75rem)] flex flex-col items-center gap-2 p-3 rounded-xl border border-dashed border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all duration-150"
                    onClick={handleOpenCreateProject}
                  >
                    <div className="w-14 h-14 rounded-2xl border border-dashed border-border/50 bg-muted/25 flex items-center justify-center">
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
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/${project.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border/40 cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {project.name || 'Untitled project'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {project.trackerSchemas.length} trackers
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
                  ))}
                  <button
                    onClick={handleOpenCreateProject}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-border/50 hover:bg-muted/30 hover:border-primary/30 transition-colors text-muted-foreground"
                  >
                    <div className="w-11 h-11 rounded-xl border border-dashed border-border/45 bg-muted/25 flex items-center justify-center flex-shrink-0">
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
              className="pt-3 mt-3 border-t border-border/50"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
                Recent trackers
              </h2>
              <div className="flex flex-col gap-1">
                {recentTrackers.map((tracker) => {
                  const isListView = tracker.listForSchemaId != null
                  const TrackerIcon = isListView ? LayoutList : FileText
                  const href = tracker.listForSchemaId ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`
                  return (
                    <Link
                      key={tracker.id}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border/40 cursor-pointer transition-colors group"
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
            </motion.div>
          )}
          {view === 'recents' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
                Recent trackers
              </h2>
              {recentTrackers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trackers yet.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentTrackers.map((tracker) => {
                    const isListView = tracker.listForSchemaId != null
                    const TrackerIcon = isListView ? LayoutList : FileText
                    const href = tracker.listForSchemaId ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`
                    return (
                      <Link
                        key={tracker.id}
                        href={href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border/40 cursor-pointer transition-colors group"
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
          className="sm:max-w-[380px] rounded-xl border-border/60 bg-background/95 shadow-xl backdrop-blur-sm p-0 gap-0 overflow-hidden"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-4 pt-6 pl-6 pr-12 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/10">
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
                className="h-10 rounded-lg border-border/80 bg-muted/30 focus:bg-background transition-colors placeholder:text-muted-foreground/60"
              />
            </div>
            <DialogFooter className="flex-row gap-2 justify-end px-6 py-4 bg-muted/20 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => setCreateProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-lg min-w-[72px]"
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
          className="fixed bottom-10 right-6 z-50 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-0.5 rounded hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </>
  )
}
