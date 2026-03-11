'use client'

import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  Loader2,
  X,
  FilePlus,
  FileText,
  Folder,
  ChevronRight,
  MoreHorizontal,
  Users,
  Settings,
  ScrollText,
  Network,
  Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Module, ModuleFile, ProjectFileType } from '../../dashboard-context'
import { PROJECT_FILE_LABELS, useDashboard } from '../../dashboard-context'
import {
  useRenameDeleteContextMenu,
  RenameDeleteContextMenuPortal,
  type ContextMenuItem,
} from '../../hooks/useRenameDeleteContextMenu'
import { dashboardQueryKeys } from '../../query-keys'
import { NewModuleButton } from '../NewModuleButton'
import { NewTrackerDialog } from '../NewTrackerDialog'

const MODULE_FILE_ICONS: Record<ProjectFileType, typeof FileText> = {
  TEAMS: Users,
  SETTINGS: Settings,
  RULES: ScrollText,
  CONNECTIONS: Network,
}

const ALL_FILE_TYPES: ProjectFileType[] = ['TEAMS', 'SETTINGS', 'RULES', 'CONNECTIONS']

const STALE_TIME_MS = 60 * 1000

function getTrackerDisplayName(name: string | null, isList: boolean): string {
  if (!name) return isList ? 'Untitled list' : 'Untitled tracker'
  if (isList && name.endsWith('.list')) return name.slice(0, -5)
  return name
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

export function ModuleContent({
  initialModule,
  initialProjectName,
  initialBreadcrumb = [],
}: {
  initialModule: Module
  initialProjectName: string | null
  initialBreadcrumb?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const moduleId = params.moduleId as string
  const queryClient = useQueryClient()

  const {
    data: mod,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: dashboardQueryKeys.module(moduleId),
    queryFn: async () => {
      const res = await fetch(`/api/modules/${moduleId}`)
      if (res.status === 404) throw new Error('Not found')
      if (!res.ok) throw new Error('Failed to load module')
      const data = (await res.json()) as Module
      return data
    },
    initialData: initialModule,
    staleTime: STALE_TIME_MS,
  })

  useEffect(() => {
    if (isError && (error as Error)?.message === 'Not found') {
      router.replace(`/dashboard/${projectId}`)
    }
  }, [isError, error, router, projectId])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [addingConfig, setAddingConfig] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const clickNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { fetchProjects, setProjects } = useDashboard()
  const projectName = initialProjectName ?? null
  const breadcrumb = initialBreadcrumb ?? []

  const invalidateModuleAndProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.module(moduleId) })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.projects() })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.project(projectId) })
  }, [queryClient, moduleId, projectId])

  // Legacy stub: creation is handled by NewModuleButton; kept so stale closures (e.g. HMR) don’t throw
  const handleCreateSubmodule = useCallback(() => {}, [])

  const onRename = useCallback(
    async (kind: ContextMenuItem['kind'], id: string, newName: string) => {
      const preserveTrackerOrder = mod?.trackerSchemas?.map((t) => t.id) ?? []
      if (kind === 'module') {
        const res = await fetch(`/api/modules/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename module')
      } else {
        const res = await fetch(`/api/trackers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename tracker')
      }
      invalidateModuleAndProjects()
      await fetchProjects()
    },
    [mod?.trackerSchemas, invalidateModuleAndProjects, fetchProjects],
  )

  const onDelete = useCallback(
    async (item: ContextMenuItem) => {
      if (item.kind === 'module') {
        const res = await fetch(`/api/modules/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete module')
        queryClient.removeQueries({ queryKey: dashboardQueryKeys.module(item.id) })
        invalidateModuleAndProjects()
        await fetchProjects()
        if (item.id === moduleId) {
          router.replace(`/dashboard/${projectId}`)
        }
      } else if (item.kind === 'tracker') {
        const res = await fetch(`/api/trackers/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete tracker')
        invalidateModuleAndProjects()
        await fetchProjects()
      }
    },
    [fetchProjects, invalidateModuleAndProjects, queryClient, router, projectId],
  )

  const optimisticRename = useCallback(
    (
      kind: ContextMenuItem['kind'],
      id: string,
      newName: string,
      previousName: string,
    ): (() => void) => {
      const applyOptimistic = (name: string) => {
        if (kind === 'module' && mod) {
          if (mod.id === id) {
            queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
              prev ? { ...prev, name } : prev,
            )
          } else {
            queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
              prev
                ? {
                    ...prev,
                    children: prev.children.map((m) =>
                      m.id === id ? { ...m, name } : m,
                    ),
                  }
                : prev,
            )
          }
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : {
                    ...p,
                    modules: updateModuleInTree(p.modules, id, (m) => ({ ...m, name })),
                  },
            ),
          )
        } else if (kind === 'tracker' && mod) {
          queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
            prev
              ? {
                  ...prev,
                  trackerSchemas: prev.trackerSchemas.map((t) =>
                    t.id === id ? { ...t, name } : t,
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
                    modules: updateModuleInTree(p.modules, moduleId, (m) => ({
                      ...m,
                      trackerSchemas: m.trackerSchemas.map((t) =>
                        t.id === id ? { ...t, name } : t,
                      ),
                    })),
                  },
            ),
          )
        }
      }
      applyOptimistic(newName)
      return () => applyOptimistic(previousName)
    },
    [mod, projectId, moduleId, queryClient, setProjects],
  )

  const optimisticDelete = useCallback(
    (item: ContextMenuItem): (() => void) | void => {
      if (item.kind === 'module' && mod) {
        const deleted = mod.id === item.id ? mod : findModuleInTree(mod.children, item.id) ?? null
        if (!deleted) return
        if (mod.id === item.id) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : { ...p, modules: removeModuleFromTree(p.modules, item.id) },
            ),
          )
          queryClient.removeQueries({ queryKey: dashboardQueryKeys.module(item.id) })
          router.replace(`/dashboard/${projectId}`)
        } else {
          queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
            prev
              ? {
                  ...prev,
                  children: prev.children.filter((m) => m.id !== item.id),
                }
              : prev,
          )
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : { ...p, modules: removeModuleFromTree(p.modules, item.id) },
            ),
          )
        }
        return () => {
          if (mod.id === item.id) {
            queryClient.setQueryData(dashboardQueryKeys.module(item.id), deleted)
            setProjects((prev) =>
              prev.map((p) =>
                p.id !== projectId
                  ? p
                  : {
                      ...p,
                      modules: deleted.parentId
                        ? updateModuleInTree(p.modules, deleted.parentId, (m) => ({
                            ...m,
                            children: [...m.children, deleted],
                          }))
                        : [...p.modules, deleted],
                    },
              ),
            )
            router.replace(`/dashboard/${projectId}/module/${item.id}`)
          } else {
            queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
              prev ? { ...prev, children: [...prev.children, deleted] } : prev,
            )
            setProjects((prev) =>
              prev.map((p) =>
                p.id !== projectId
                  ? p
                  : {
                      ...p,
                      modules: deleted.parentId
                        ? updateModuleInTree(p.modules, deleted.parentId, (m) => ({
                            ...m,
                            children: [...m.children, deleted],
                          }))
                        : [...p.modules, deleted],
                    },
              ),
            )
          }
        }
      }
      if (item.kind === 'tracker' && mod) {
        const tracker = mod.trackerSchemas.find((t) => t.id === item.id)
        if (!tracker) return
        queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
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
                  modules: updateModuleInTree(p.modules, moduleId, (m) => ({
                    ...m,
                    trackerSchemas: m.trackerSchemas.filter(
                      (t) => t.id !== item.id,
                    ),
                  })),
                },
          ),
        )
        return () => {
          queryClient.setQueryData<Module>(dashboardQueryKeys.module(moduleId), (prev) =>
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
                    modules: updateModuleInTree(p.modules, moduleId, (m) => ({
                      ...m,
                      trackerSchemas: [...m.trackerSchemas, tracker],
                    })),
                  },
            ),
          )
        }
      }
    },
    [mod, projectId, moduleId, queryClient, setProjects, router],
  )

  const {
    contextMenu,
    renaming,
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const moduleFiles = mod?.moduleFiles ?? []
  const trackerSchemas = mod?.trackerSchemas ?? []
  const childModules = mod?.children ?? []
  const totalItems =
    moduleFiles.length + trackerSchemas.length + childModules.length
  const isEmpty = totalItems === 0

  const existingFileTypes = new Set(moduleFiles.map((f) => f.type))
  const availableFileTypes = ALL_FILE_TYPES.filter((t) => !existingFileTypes.has(t))

  const tableRows = useMemo(() => {
    if (!mod) return []
    const listCompanionByParent = new Map(
      trackerSchemas
        .filter((t) => t.listForSchemaId != null)
        .map((t) => [t.listForSchemaId as string, t.id]),
    )
    const fileRows = moduleFiles.map((file: ModuleFile) => ({
      kind: 'file' as const,
      id: file.id,
      label: PROJECT_FILE_LABELS[file.type],
      sublabel: 'Override',
      icon: MODULE_FILE_ICONS[file.type],
      updatedAt: file.updatedAt,
      href: `/dashboard/${projectId}/module/${moduleId}/file/${file.id}`,
    }))
    const moduleRows = childModules.map((child) => ({
      kind: 'module' as const,
      id: child.id,
      label: child.name || 'Untitled module',
      sublabel: `${child.trackerSchemas.length} tracker${child.trackerSchemas.length !== 1 ? 's' : ''}`,
      icon: Folder,
      updatedAt: child.updatedAt,
      href: `/dashboard/${projectId}/module/${child.id}`,
    }))
    const trackerRows = trackerSchemas.map((tracker) => {
      const parentId = tracker.listForSchemaId ?? tracker.id
      const listHref = tracker.listForSchemaId
        ? `/tracker-list/${tracker.id}`
        : tracker.instance === 'MULTI'
          ? `/tracker-list/${tracker.id}`
          : (listCompanionByParent.get(tracker.id) ? `/tracker-list/${listCompanionByParent.get(tracker.id)}` : null)
      return {
        kind: 'tracker' as const,
        id: tracker.id,
        label: getTrackerDisplayName(tracker.name, tracker.listForSchemaId != null),
        sublabel: 'Tracker',
        icon: FileText,
        updatedAt: tracker.updatedAt,
        href: tracker.listForSchemaId ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`,
        trackerHrefs: {
          trackerPageHref: `/tracker/${parentId}`,
          schemaEditHref: `/tracker/${parentId}/edit`,
          listHref,
          bindingsHref: `/tracker/${parentId}/bindings`,
          validationsHref: `/tracker/${parentId}/validations`,
          calculationsHref: `/tracker/${parentId}/calculations`,
        },
      }
    })
    return [...fileRows, ...moduleRows, ...trackerRows]
  }, [projectId, moduleId, mod, moduleFiles, childModules, trackerSchemas])

  const handleTrackerCreated = useCallback(
    async (trackerId: string) => {
      invalidateModuleAndProjects()
      await fetchProjects()
      router.push(`/tracker/${trackerId}/edit?new=true`)
    },
    [invalidateModuleAndProjects, fetchProjects, router],
  )

  const handleAddConfig = async (type: ProjectFileType) => {
    setAddingConfig(true)
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/modules/${moduleId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error('Failed to add config')
      invalidateModuleAndProjects()
      await fetchProjects()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Error adding config')
    } finally {
      setAddingConfig(false)
    }
  }

  const displayError = errorMessage ?? (isError && error ? (error as Error).message : null)

  if (loading && !mod) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (!mod) {
    return null
  }

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-3 gap-3 bg-background/80">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex-shrink-0">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50 flex-shrink-0" />
            <Link
              href={`/dashboard/${projectId}`}
              className="hover:text-foreground transition-colors flex-shrink-0"
            >
              {projectName || 'Untitled folder'}
            </Link>
            {breadcrumb.length > 0 && (
              <>
                {breadcrumb.slice(0, -1).map((item) => (
                  <span key={item.id} className="flex items-center gap-2 flex-shrink-0">
                    <ChevronRight className="h-3 w-3 opacity-50" />
                    <Link
                      href={`/dashboard/${projectId}/module/${item.id}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </span>
                ))}
                <ChevronRight className="h-3 w-3 opacity-50 flex-shrink-0" />
              </>
            )}
            {renaming?.kind === 'module' && renaming.id === mod.id ? (
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
                    kind: 'module',
                    id: mod.id,
                    label: mod.name || 'Untitled module',
                  })
                }
                onDoubleClick={(e) => {
                  e.preventDefault()
                  startRename({
                    kind: 'module',
                    id: mod.id,
                    label: mod.name || 'Untitled module',
                  })
                }}
              >
                {mod.name || 'Untitled module'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <NewModuleButton
              projectId={projectId}
              parentId={moduleId}
              variant="toolbar"
              onError={(msg) => setErrorMessage(msg || null)}
            />
            {availableFileTypes.length > 0 && (
              <div className="relative group">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 rounded-md text-xs font-medium"
                  disabled={addingConfig}
                >
                  {addingConfig ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add Config
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px] hidden group-hover:block z-20">
                  {availableFileTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAddConfig(type)}
                      disabled={addingConfig}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted/60 transition-colors"
                    >
                      {PROJECT_FILE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <NewTrackerDialog
              projectId={projectId}
              moduleId={moduleId}
              onCreated={handleTrackerCreated}
              onError={(msg) => setErrorMessage(msg)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-6">
          <div className="h-full min-h-0">
            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center border border-dashed border-border/30">
                  <FileText className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-xs font-medium">This module is empty</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <NewModuleButton
                    projectId={projectId}
                    parentId={moduleId}
                    variant="empty"
                    onError={(msg) => setErrorMessage(msg || null)}
                  />
                  <NewTrackerDialog
                    projectId={projectId}
                    moduleId={moduleId}
                    onCreated={handleTrackerCreated}
                    onError={(msg) => setErrorMessage(msg)}
                    trigger={
                      <Button size="sm" variant="secondary" className="rounded-full gap-1.5">
                        <FilePlus className="h-3.5 w-3.5" />
                        New Tracker
                      </Button>
                    }
                  />
                </div>
              </div>
            ) : (
              <div
                className="flex flex-wrap gap-6 w-fit"
                aria-label="Module items"
              >
                {tableRows.map((row) => {
                  const Icon = row.icon
                  const contextItem: ContextMenuItem = {
                    kind: row.kind,
                    id: row.id,
                    label: row.label,
                    ...('trackerHrefs' in row ? { trackerHrefs: row.trackerHrefs } : {}),
                  }
                  const isRenamingThis =
                    renaming &&
                    renaming.kind === row.kind &&
                    renaming.id === row.id
                  const canRenameDelete = row.kind === 'module' || row.kind === 'tracker'
                  return (
                    <div
                      key={
                        row.kind === 'file'
                          ? `file-${row.id}`
                          : `${row.kind}-${row.id}`
                      }
                      className="relative flex flex-col items-center gap-2.5 w-[6.5rem] flex-shrink-0 group/card"
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
                      {row.kind === 'tracker' && !isRenamingThis && (
                        <button
                          type="button"
                          className="absolute top-1 right-1 z-20 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted/80 hover:text-foreground group-hover/card:opacity-100"
                          aria-label="Tracker actions"
                          onClick={(e: MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation()
                            openContextMenu(e, contextItem)
                          }}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      )}
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
