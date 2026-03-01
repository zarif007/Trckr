'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Loader2,
  Monitor,
  X,
  FolderPlus,
  FilePlus,
  Clock,
  User,
  FolderOpen,
  FileText,
  HardDrive,
  Calendar,
  ChevronRight,
  ChevronDown,
  MoreVertical,
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

export default function DashboardProjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.status === 404) {
        router.replace('/dashboard')
        return
      }
      if (!res.ok) throw new Error('Failed to load project')
      const data = await res.json()
      setProject(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [projectId, router])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) return
      const data = await res.json()
      setProjects(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && projectId) {
      setLoading(true)
      fetchProject()
      fetchProjects()
    }
  }, [status, projectId, fetchProject, fetchProjects])

  const handleCreateTracker = async () => {
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

  if (status === 'loading' || (status === 'authenticated' && loading && !project)) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.replace('/dashboard')
    return null
  }

  if (!project) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground overflow-hidden flex flex-col font-sans select-none mt-10">
      <header className="h-9 flex-shrink-0 border-b border-border/60 flex items-center justify-between px-3 bg-background/95">
      </header>

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
                'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Monitor className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-xs truncate">Desktop</span>}
            </Link>
            {!sidebarCollapsed && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Folders
                </div>
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/${p.id}`}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                      p.id === projectId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <FolderOpen className="h-4 w-4 flex-shrink-0 opacity-70" />
                    <span className="text-xs truncate flex-1">
                      {p.name || 'Untitled folder'}
                    </span>
                    {p.trackerSchemas.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                        {p.trackerSchemas.length}
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
                </div>
              )}
            </div>
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1 rounded hover:bg-muted/60 text-muted-foreground"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
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

        <main className="flex-1 flex flex-col min-w-0">
          <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 rounded-md text-xs font-medium"
                onClick={handleCreateTracker}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FilePlus className="h-3.5 w-3.5" />
                )}
                New File
              </Button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Desktop
              </Link>
              <ChevronRight className="h-3 w-3 opacity-50" />
              <span className="font-medium text-foreground">
                {project.name || 'Untitled folder'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="h-full flex flex-col rounded-xl border border-border/50 bg-background/50 overflow-hidden min-h-0">
              {project.trackerSchemas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center border border-dashed border-border/30">
                    <FileText className="h-7 w-7 opacity-40" />
                  </div>
                  <p className="text-xs font-medium">This folder is empty</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full gap-1.5"
                    onClick={handleCreateTracker}
                    disabled={creating}
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    New File
                  </Button>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-background/90 backdrop-blur border-b border-border/40 z-10">
                      <tr className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left w-32">Modified</th>
                        <th className="px-4 py-3 w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {project.trackerSchemas.map((tracker) => (
                        <tr
                          key={tracker.id}
                          onClick={() => router.push(`/tracker/${tracker.id}`)}
                          className="group hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                <FileText className="h-4 w-4 text-primary/60" />
                              </div>
                              <div>
                                <span className="text-sm font-medium block">
                                  {tracker.name || 'Untitled tracker'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Tracker
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 opacity-50" />
                              {new Date(tracker.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              className="p-1.5 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 border-t border-border/30">
                    <button
                      onClick={handleCreateTracker}
                      disabled={creating}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {creating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FilePlus className="h-3.5 w-3.5" />
                      )}
                      New File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20">
        <span>
          {project.trackerSchemas.length} item
          {project.trackerSchemas.length !== 1 ? 's' : ''}
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
