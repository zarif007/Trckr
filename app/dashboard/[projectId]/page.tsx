'use client'

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type MouseEvent,
} from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  Loader2,
  X,
  FilePlus,
  FolderPlus,
  FileText,
  Folder,
  ChevronRight,
  Users,
  Settings,
  ScrollText,
  Network,
  Pencil,
  Trash2,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Project, ProjectFile, ProjectFileType } from '../dashboard-context'
import { PROJECT_FILE_LABELS, useDashboard } from '../dashboard-context'

type RowKind = 'file' | 'module' | 'tracker'

type ContextMenuItem = {
  kind: RowKind | 'project'
  id: string
  label: string
}

const PROJECT_FILE_ICONS: Record<ProjectFileType, typeof FileText> = {
  TEAMS: Users,
  SETTINGS: Settings,
  RULES: ScrollText,
  CONNECTIONS: Network,
}

export default function DashboardProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [creatingModule, setCreatingModule] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    item: ContextMenuItem
  } | null>(null)
  const [renaming, setRenaming] = useState<{
    kind: RowKind | 'project'
    id: string
    currentName: string
  } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const clickNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const { fetchProjects, setProjects } = useDashboard()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    try {
      setLoading(true)
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

  useEffect(() => {
    if (projectId) fetchProject()
  }, [projectId, fetchProject])

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renaming])

  useEffect(() => {
    const close = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', close)
      window.addEventListener('scroll', close, true)
      return () => {
        window.removeEventListener('click', close)
        window.removeEventListener('scroll', close, true)
      }
    }
  }, [contextMenu])

  const openContextMenu = useCallback(
    (e: MouseEvent, item: ContextMenuItem) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY, item })
    },
    [],
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const startRename = useCallback(
    (item: ContextMenuItem) => {
      closeContextMenu()
      setRenaming({
        kind: item.kind,
        id: item.id,
        currentName: item.label,
      })
    },
    [closeContextMenu],
  )

  const submitRename = useCallback(
    async (newName: string) => {
      const trim = newName.trim()
      if (!renaming || !trim) {
        setRenaming(null)
        return
      }
      const { kind, id, currentName: previousName } = renaming
      setError(null)
      setRenaming(null)

      const applyOptimistic = (name: string) => {
        setProject((prev) => {
          if (!prev) return prev
          if (kind === 'project') return { ...prev, name }
          if (kind === 'module') {
            return {
              ...prev,
              modules: prev.modules.map((m) =>
                m.id === id ? { ...m, name } : m,
              ),
            }
          }
          return {
            ...prev,
            trackerSchemas: prev.trackerSchemas.map((t) =>
              t.id === id ? { ...t, name } : t,
            ),
          }
        })
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p
            if (kind === 'project') return { ...p, name }
            if (kind === 'module') {
              return {
                ...p,
                modules: p.modules.map((m) =>
                  m.id === id ? { ...m, name } : m,
                ),
              }
            }
            return {
              ...p,
              trackerSchemas: p.trackerSchemas.map((t) =>
                t.id === id ? { ...t, name } : t,
              ),
            }
          }),
        )
      }

      applyOptimistic(trim)

      try {
        if (kind === 'project') {
          const res = await fetch(`/api/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trim }),
          })
          if (!res.ok) throw new Error('Failed to rename project')
        } else if (kind === 'module') {
          const res = await fetch(`/api/modules/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trim }),
          })
          if (!res.ok) throw new Error('Failed to rename module')
        } else if (kind === 'tracker') {
          const res = await fetch(`/api/trackers/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trim }),
          })
          if (!res.ok) throw new Error('Failed to rename tracker')
        }
        await fetchProjects()
      } catch (e) {
        applyOptimistic(previousName)
        setError(e instanceof Error ? e.message : 'Rename failed')
      }
    },
    [renaming, fetchProjects, setProjects, projectId],
  )

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitRename(e.currentTarget.value)
      }
      if (e.key === 'Escape') {
        setRenaming(null)
      }
    },
    [submitRename],
  )

  const handleDelete = useCallback(
    async (item: ContextMenuItem) => {
      closeContextMenu()
      const message =
        item.kind === 'project'
          ? `Delete project "${item.label}"? This will remove the project and all its modules and trackers.`
          : item.kind === 'module'
            ? `Delete module "${item.label}"? This will remove the module and all its trackers.`
            : `Delete tracker "${item.label}"?`
      if (!window.confirm(message)) return
      setError(null)
      try {
        if (item.kind === 'project') {
          const res = await fetch(`/api/projects/${item.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Failed to delete project')
          await fetchProjects()
          router.replace('/dashboard')
        } else if (item.kind === 'module') {
          const res = await fetch(`/api/modules/${item.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Failed to delete module')
          await fetchProject()
          await fetchProjects()
        } else if (item.kind === 'tracker') {
          const res = await fetch(`/api/trackers/${item.id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Failed to delete tracker')
          await fetchProject()
          await fetchProjects()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed')
      }
    },
    [closeContextMenu, fetchProject, fetchProjects, router],
  )

  const projectFiles = project?.projectFiles ?? []
  const modules = project?.modules ?? []
  const projectLevelTrackers = useMemo(
    () => (project?.trackerSchemas ?? []).filter((t) => !t.moduleId),
    [project?.trackerSchemas],
  )
  const totalItems = projectFiles.length + modules.length + projectLevelTrackers.length
  const isEmpty = totalItems === 0

  const tableRows = useMemo(() => {
    if (!project) return []
    const fileRows = projectFiles.map((file: ProjectFile) => ({
      kind: 'file' as const,
      id: file.id,
      label: PROJECT_FILE_LABELS[file.type],
      sublabel: '',
      icon: PROJECT_FILE_ICONS[file.type],
      updatedAt: file.updatedAt,
      href: `/dashboard/${projectId}/file/${file.id}`,
    }))
    const moduleRows = modules.map((mod) => ({
      kind: 'module' as const,
      id: mod.id,
      label: mod.name || 'Untitled module',
      sublabel: `${mod.trackerSchemas.length} tracker${mod.trackerSchemas.length !== 1 ? 's' : ''}`,
      icon: Folder,
      updatedAt: mod.updatedAt,
      href: `/dashboard/${projectId}/module/${mod.id}`,
    }))
    const trackerRows = projectLevelTrackers.map((tracker) => ({
      kind: 'tracker' as const,
      id: tracker.id,
      label: tracker.name || 'Untitled tracker',
      sublabel: 'Tracker',
      icon: FileText,
      updatedAt: tracker.updatedAt,
      href: `/tracker/${tracker.id}`,
    }))
    return [...fileRows, ...moduleRows, ...trackerRows]
  }, [projectId, project, projectFiles, modules, projectLevelTrackers])

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
      router.push(`/tracker/${data.id}?new=true`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating tracker')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateModule = async () => {
    setCreatingModule(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Module' }),
      })
      if (!res.ok) throw new Error('Failed to create module')
      const mod = (await res.json()) as { id: string }
      await fetchProject()
      await fetchProjects()
      router.push(`/dashboard/${projectId}/module/${mod.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating module')
    } finally {
      setCreatingModule(false)
    }
  }

  if (loading && !project) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex-shrink-0">
              Desktop
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50 flex-shrink-0" />
            {renaming?.kind === 'project' && renaming.id === project.id ? (
              <Input
                ref={renameInputRef}
                className="h-6 text-[11px] font-medium w-40 max-w-[50vw]"
                defaultValue={renaming.currentName}
                onBlur={(e) => submitRename(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="font-medium text-foreground truncate cursor-default select-none rounded px-1 -mx-1 py-0.5 hover:bg-muted/50"
                onContextMenu={(e) =>
                  openContextMenu(e, {
                    kind: 'project',
                    id: project.id,
                    label: project.name || 'Untitled folder',
                  })
                }
                onDoubleClick={(e) => {
                  e.preventDefault()
                  startRename({
                    kind: 'project',
                    id: project.id,
                    label: project.name || 'Untitled folder',
                  })
                }}
              >
                {project.name || 'Untitled folder'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 rounded-md text-xs font-medium"
              onClick={handleCreateModule}
              disabled={creatingModule}
            >
              {creatingModule ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" />
              )}
              New Module
            </Button>
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
              New Tracker
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="h-full min-h-0">
            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center border border-dashed border-border/30">
                  <FileText className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-xs font-medium">This folder is empty</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full gap-1.5"
                    onClick={handleCreateModule}
                    disabled={creatingModule}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    New Module
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full gap-1.5"
                    onClick={handleCreateTracker}
                    disabled={creating}
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    New Tracker
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))] max-w-2xl"
                aria-label="Project items"
              >
                {tableRows.map((row) => {
                  const Icon = row.icon
                  const contextItem: ContextMenuItem = {
                    kind: row.kind,
                    id: row.id,
                    label: row.label,
                  }
                  const isRenamingThis =
                    renaming &&
                    renaming.kind === row.kind &&
                    renaming.id === row.id
                  const canRenameDelete = row.kind === 'module' || row.kind === 'tracker'
                  return (
                    <div
                      key={row.kind === 'file' ? `file-${row.id}` : `${row.kind}-${row.id}`}
                      className="flex flex-col items-center gap-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isRenamingThis) return
                          if (clickNavigateTimeoutRef.current)
                            clearTimeout(clickNavigateTimeoutRef.current)
                          clickNavigateTimeoutRef.current = setTimeout(() => {
                            clickNavigateTimeoutRef.current = null
                            router.push(row.href)
                          }, 200)
                        }}
                        onDoubleClick={(e) => {
                          if (canRenameDelete) {
                            e.preventDefault()
                            if (clickNavigateTimeoutRef.current) {
                              clearTimeout(clickNavigateTimeoutRef.current)
                              clickNavigateTimeoutRef.current = null
                            }
                            startRename(contextItem)
                          }
                        }}
                        onContextMenu={
                          canRenameDelete
                            ? (e) => openContextMenu(e, contextItem)
                            : undefined
                        }
                        className="group flex flex-col items-center gap-2.5 rounded-xl p-4 w-full hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-muted transition-colors">
                          <Icon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        {isRenamingThis ? (
                          <Input
                            ref={renameInputRef}
                            className="text-sm font-medium h-7 w-full text-center"
                            defaultValue={renaming.currentName}
                            onBlur={(e) => submitRename(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-center leading-tight truncate w-full">
                            {row.label}
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20">
        <span>
          {totalItems} item
          {totalItems !== 1 ? 's' : ''}
        </span>
        <span className="tabular-nums">
          {currentTime.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {contextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[100] min-w-[160px] rounded-lg border bg-popover text-popover-foreground shadow-md py-1 animate-in fade-in-0 zoom-in-95"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80"
              onClick={() => startRename(contextMenu.item)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 text-destructive"
              onClick={() => handleDelete(contextMenu.item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}

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
