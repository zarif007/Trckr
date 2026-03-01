'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  FolderOpen,
  Loader2,
  Monitor,
  X,
  FolderPlus,
  FilePlus,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  HardDrive,
  LayoutGrid,
  List,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TrackerSchema = {
  id: string
  name: string | null
  projectId: string
  instance: string
  createdAt: string
  updatedAt: string
}

type Project = {
  id: string
  name: string | null
  userId: string
  createdAt: string
  updatedAt: string
  trackerSchemas: TrackerSchema[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) {
        if (res.status === 401) return
        throw new Error('Failed to load projects')
      }
      const data = await res.json()
      setProjects(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchProjects()
  }, [status, fetchProjects])

  const handleCreateProject = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Folder' }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      await fetchProjects()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating folder')
    } finally {
      setCreating(false)
    }
  }

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
      router.push(`/tracker/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating file')
    } finally {
      setCreating(false)
    }
  }

  const totalTrackers = projects.reduce((acc, p) => acc + p.trackerSchemas.length, 0)
  const lastActivity =
    projects.length > 0
      ? projects
        .flatMap((p) =>
          p.trackerSchemas.map((t) => ({ date: t.updatedAt, name: p.name }))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null

  if (status === 'loading' || (status === 'authenticated' && loading)) {
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
      {/* Window title bar */}
      <header className="h-9 flex-shrink-0 border-b border-border/60 flex items-center justify-between px-3 bg-background/95">
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Places + This PC */}
        <aside
          className={cn(
            'flex-shrink-0 border-r border-border/50 flex flex-col bg-muted/20 transition-[width] duration-200',
            sidebarCollapsed ? 'w-12' : 'w-52'
          )}
        >
          <div className="p-2 flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors bg-primary/10 text-primary font-medium"
            >
              <LayoutGrid className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-xs truncate">Desktop</span>}
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
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
          {/* This PC / Info strip */}
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
                      Last: {new Date(lastActivity.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 rounded-md text-xs font-medium"
                onClick={handleCreateProject}
                disabled={creating}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New Folder
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 rounded-md text-xs font-medium"
                onClick={() => handleCreateTracker()}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FilePlus className="h-3.5 w-3.5" />
                )}
                New File
              </Button>
              <div className="w-px h-4 bg-border/60" />
              <div className="flex rounded-md border border-border/50 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-1.5 transition-colors',
                    viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 transition-colors',
                    viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Desktop</span>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'h-full',
                viewMode === 'grid'
                  ? 'grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4 content-start'
                  : 'flex flex-col gap-1'
              )}
            >
              {viewMode === 'grid' ? (
                <>
                  {projects.map((project) => (
                    <Link key={project.id} href={`/dashboard/${project.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-colors group"
                      >
                        <div className="relative w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center border border-border/30 group-hover:border-primary/20 transition-colors">
                          <FolderOpen className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          {project.trackerSchemas.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[1rem] h-4 px-1 flex items-center justify-center">
                              {project.trackerSchemas.length}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-center truncate w-full">
                          {project.name || 'Untitled'}
                        </span>
                      </motion.div>
                    </Link>
                  ))}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-dashed border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-colors"
                    onClick={handleCreateProject}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                      {creating ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                      ) : (
                        <FolderPlus className="h-6 w-6 text-muted-foreground/60" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      New Folder
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
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {project.name || 'Untitled folder'}
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
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                  <button
                    onClick={handleCreateProject}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-border/50 hover:bg-muted/30 hover:border-primary/20 transition-colors text-muted-foreground"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FolderPlus className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium">New Folder</span>
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Status bar */}
      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20">
        <span>
          {projects.length} folders · {totalTrackers} trackers
        </span>
        <span className="tabular-nums">
          {currentTime.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 right-6 z-50 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-0.5 rounded hover:bg-destructive/20">
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  )
}
