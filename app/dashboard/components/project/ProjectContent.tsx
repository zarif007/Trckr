'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  Project,
  ProjectFile,
  ProjectFileType,
  Module,
} from '../../dashboard-context'
import { PROJECT_FILE_LABELS, useDashboard } from '../../dashboard-context'
import {
  useRenameDeleteContextMenu,
  RenameDeleteContextMenuPortal,
  type ContextMenuItem,
} from '../../hooks/useRenameDeleteContextMenu'
import { dashboardQueryKeys } from '../../query-keys'
import { DashboardPageSkeleton } from '../skeleton/DashboardPageSkeleton'

const PROJECT_FILE_ICONS: Record<ProjectFileType, typeof FileText> = {
  TEAMS: Users,
  SETTINGS: Settings,
  RULES: ScrollText,
  CONNECTIONS: Network,
}

const STALE_TIME_MS = 60 * 1000

function updateModuleInTree(
  modules: Module[],
  id: string,
  upd: (m: Module) => Module,
): Module[] {
  return modules.map((m) =>
    m.id === id ? upd(m) : { ...m, children: updateModuleInTree(m.children, id, upd) },
  )
}

function removeModuleFromTree(modules: Module[], id: string): Module[] {
  return modules
    .filter((m) => m.id !== id)
    .map((m) => ({ ...m, children: removeModuleFromTree(m.children, id) }))
}

function findModuleInTree(modules: Module[], id: string): Module | null {
  for (const m of modules) {
    if (m.id === id) return m
    const found = findModuleInTree(m.children, id)
    if (found) return found
  }
  return null
}

export function ProjectContent({
  initialProject,
}: {
  initialProject: Project
}) {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  const {
    data: project,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: dashboardQueryKeys.project(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.status === 404) throw new Error('Not found')
      if (!res.ok) throw new Error('Failed to load project')
      return res.json() as Promise<Project>
    },
    initialData: initialProject,
    staleTime: STALE_TIME_MS,
  })

  useEffect(() => {
    if (isError && (error as Error)?.message === 'Not found') {
      router.replace('/dashboard')
    }
  }, [isError, error, router])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [creatingModule, setCreatingModule] = useState(false)
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [moduleName, setModuleName] = useState('')
  const createModuleInputRef = useRef<HTMLInputElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const clickNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const { fetchProjects, setProjects } = useDashboard()

  useEffect(() => {
    if (createModuleOpen) {
      setModuleName('')
      requestAnimationFrame(() => createModuleInputRef.current?.focus())
    }
  }, [createModuleOpen])

  const invalidateProjectAndProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.project(projectId) })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.projects() })
  }, [queryClient, projectId])

  const onRename = useCallback(
    async (
      kind: ContextMenuItem['kind'],
      id: string,
      newName: string,
    ) => {
      if (kind === 'project') {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename project')
      } else if (kind === 'module') {
        const res = await fetch(`/api/modules/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename module')
      } else if (kind === 'tracker') {
        const res = await fetch(`/api/trackers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename tracker')
      }
      await fetchProjects()
      invalidateProjectAndProjects()
    },
    [fetchProjects, invalidateProjectAndProjects],
  )

  const optimisticRename = useCallback(
    (
      kind: ContextMenuItem['kind'],
      id: string,
      newName: string,
      previousName: string,
    ): (() => void) => {
      const applyOptimistic = (name: string) => {
        queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) => {
          if (!prev) return prev
          if (kind === 'project') return { ...prev, name }
          if (kind === 'module') {
            return {
              ...prev,
              modules: updateModuleInTree(prev.modules, id, (m) => ({ ...m, name })),
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
                modules: updateModuleInTree(p.modules, id, (m) => ({ ...m, name })),
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
      applyOptimistic(newName)
      return () => applyOptimistic(previousName)
    },
    [projectId, queryClient, setProjects],
  )

  const onDelete = useCallback(
    async (item: ContextMenuItem) => {
      if (item.kind === 'project') {
        const res = await fetch(`/api/projects/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete project')
        await fetchProjects()
        queryClient.removeQueries({ queryKey: dashboardQueryKeys.project(item.id) })
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.projects() })
        router.replace('/dashboard')
      } else if (item.kind === 'module') {
        const res = await fetch(`/api/modules/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete module')
        invalidateProjectAndProjects()
        await fetchProjects()
      } else if (item.kind === 'tracker') {
        const res = await fetch(`/api/trackers/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete tracker')
        invalidateProjectAndProjects()
        await fetchProjects()
      }
    },
    [fetchProjects, invalidateProjectAndProjects, queryClient, router],
  )

  const optimisticDelete = useCallback(
    (item: ContextMenuItem): (() => void) | void => {
      if (item.kind === 'project' && project?.id === item.id) {
        const deleted = project
        queryClient.removeQueries({ queryKey: dashboardQueryKeys.project(item.id) })
        setProjects((prev) => prev.filter((p) => p.id !== item.id))
        router.replace('/dashboard')
        return () => {
          queryClient.setQueryData(dashboardQueryKeys.project(item.id), deleted)
          setProjects((prev) => [...prev, deleted])
          router.replace(`/dashboard/${item.id}`)
        }
      }
      if (item.kind === 'module' && project) {
        const mod = findModuleInTree(project.modules, item.id)
        if (!mod) return
        queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
          prev
            ? { ...prev, modules: removeModuleFromTree(prev.modules, item.id) }
            : prev,
        )
        setProjects((prev) =>
          prev.map((p) =>
            p.id !== projectId
              ? p
              : { ...p, modules: removeModuleFromTree(p.modules, item.id) },
          ),
        )
        return () => {
          const insertAt = mod.parentId
            ? (prev: Project) => ({
                ...prev,
                modules: updateModuleInTree(prev.modules, mod.parentId!, (m) => ({
                  ...m,
                  children: [...m.children, mod],
                })),
              })
            : (prev: Project) => ({
                ...prev,
                modules: [...prev.modules, mod],
              })
          queryClient.setQueryData<Project>(
            dashboardQueryKeys.project(projectId),
            (prev) => (prev ? insertAt(prev) : prev),
          )
          setProjects((prev) =>
            prev.map((p) => (p.id !== projectId ? p : insertAt(p))),
          )
        }
      }
      if (item.kind === 'tracker' && project) {
        const tracker = project.trackerSchemas.find((t) => t.id === item.id)
        if (!tracker) return
        queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
          prev
            ? {
                ...prev,
                trackerSchemas: prev.trackerSchemas.filter(
                  (t) => t.id !== item.id,
                ),
              }
            : prev,
        )
        setProjects((prev) =>
          prev.map((p) =>
            p.id !== projectId
              ? p
              : {
                  ...p,
                  trackerSchemas: p.trackerSchemas.filter(
                    (t) => t.id !== item.id,
                  ),
                },
          ),
        )
        return () => {
          queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
            prev
              ? {
                  ...prev,
                  trackerSchemas: [...prev.trackerSchemas, tracker],
                }
              : prev,
          )
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : {
                    ...p,
                    trackerSchemas: [...p.trackerSchemas, tracker],
                  },
            ),
          )
        }
      }
    },
    [project, projectId, queryClient, setProjects, router],
  )

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const {
    contextMenu,
    renaming,
    setRenaming,
    renameInputRef,
    openContextMenu,
    startRename,
    submitRename,
    handleRenameKeyDown,
    handleDelete,
  } = useRenameDeleteContextMenu({
    onRename,
    onDelete,
    setError: setErrorMessage,
    optimisticRename,
    optimisticDelete,
  })

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
    setErrorMessage(null)
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
      setErrorMessage(e instanceof Error ? e.message : 'Error creating tracker')
    } finally {
      setCreating(false)
    }
  }

  const handleCreateModule = useCallback(
    async (nameOverride?: string) => {
      const name = (nameOverride ?? moduleName).trim() || 'New Module'
      setCreatingModule(true)
      setErrorMessage(null)
      setCreateModuleOpen(false)
      try {
        const res = await fetch(`/api/projects/${projectId}/modules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error('Failed to create module')
        const mod = (await res.json()) as { id: string }
        invalidateProjectAndProjects()
        await fetchProjects()
        router.push(`/dashboard/${projectId}/module/${mod.id}`)
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Error creating module')
      } finally {
        setCreatingModule(false)
      }
    },
    [projectId, moduleName, invalidateProjectAndProjects, fetchProjects, router],
  )

  const handleCreateModuleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreateModule(e.currentTarget.value)
      }
    },
    [handleCreateModule],
  )

  const displayError = errorMessage ?? (isError && error ? (error as Error).message : null)

  if (loading && !project) {
    return <DashboardPageSkeleton breadcrumbCount={3} />
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
              Dashboard
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
              onClick={() => setCreateModuleOpen(true)}
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
                    onClick={() => setCreateModuleOpen(true)}
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
                className="flex flex-wrap gap-6 w-fit"
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
                      className="flex flex-col items-center gap-2.5 w-[6.5rem] flex-shrink-0"
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

      <Dialog open={createModuleOpen} onOpenChange={setCreateModuleOpen}>
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
                  New module
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground/90">
                  Give your module a name. You can rename it anytime.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 pb-6 space-y-2">
              <label
                htmlFor="create-module-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Module name
              </label>
              <Input
                id="create-module-name"
                ref={createModuleInputRef}
                placeholder="e.g. Product team"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                onKeyDown={handleCreateModuleKeyDown}
                className="h-10 rounded-lg border-border/80 bg-muted/30 focus:bg-background transition-colors placeholder:text-muted-foreground/60"
              />
            </div>
            <DialogFooter className="flex-row gap-2 justify-end px-6 py-4 bg-muted/20 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => setCreateModuleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-lg min-w-[72px]"
                onClick={() => handleCreateModule()}
                disabled={creatingModule}
              >
                {creatingModule ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <RenameDeleteContextMenuPortal
        contextMenu={contextMenu}
        onStartRename={startRename}
        onDelete={handleDelete}
      />

      {displayError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 right-6 z-50 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg"
        >
          <span>{displayError}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-0.5 rounded hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </>
  )
}
