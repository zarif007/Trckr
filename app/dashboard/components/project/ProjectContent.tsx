'use client'

import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import {
  X,
  FilePlus,
  FileText,
  LayoutList,
  Folder,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  Project,
  Module,
} from '../../dashboard-context'
import { useDashboard } from '../../dashboard-context'
import {
  useRenameDeleteContextMenu,
  RenameDeleteContextMenuPortal,
  type ContextMenuItem,
} from '../../hooks/useRenameDeleteContextMenu'
import { dashboardQueryKeys } from '../../query-keys'
import { CreateDropdown } from '../CreateDropdown'
import { DashboardPageSkeleton } from '../skeleton/DashboardPageSkeleton'
import { type ConfigTileRow } from '../configs/configRows'

const STALE_TIME_MS = 60 * 1000
const TILE_ICON_SHELL =
  'w-14 h-14 rounded-2xl bg-muted/45 border border-border/40 shadow-sm flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:border-primary/35 group-hover:bg-primary/8 group-hover:shadow-md'
const TILE_ICON = 'h-7 w-7 text-foreground/75 transition-colors group-hover:text-primary'

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

export function ProjectContent({
  initialProject,
}: {
  initialProject: Project
}) {
  const router = useRouter()
  const pathname = usePathname()
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
  const [currentTime, setCurrentTime] = useState(new Date())
  const clickNavigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const { fetchProjects, setProjects } = useDashboard()

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
          const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
          router.replace(`${base}/${item.id}`)
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
    [project, projectId, queryClient, setProjects, router, pathname],
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

  const projectSystemFiles = (project?.trackerSchemas ?? []).filter(
    (t) => t.type === 'SYSTEM' && !t.moduleId && t.systemType != null,
  )
  const modules = project?.modules ?? []
  const projectLevelTrackers = useMemo(
    () =>
      (project?.trackerSchemas ?? []).filter(
        (t) => !t.moduleId && t.type === 'GENERAL',
      ),
    [project?.trackerSchemas],
  )
  const hasProjectConfigs = projectSystemFiles.length > 0
  const totalItems =
    (hasProjectConfigs ? 1 : 0) + modules.length + projectLevelTrackers.length
  const isEmpty = totalItems === 0

  const tableRows = useMemo(() => {
    if (!project) return []
    const listCompanionByParent = new Map(
      projectLevelTrackers
        .filter((t) => t.listForSchemaId != null)
        .map((t) => [t.listForSchemaId as string, t.id]),
    )
    const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
    const rows: (ConfigTileRow | {
      kind: 'module'
      id: string
      label: string
      sublabel: string
      icon: typeof Folder
      updatedAt: string
      href: string
    } | {
      kind: 'tracker'
      id: string
      label: string
      sublabel: string
      icon: typeof FileText | typeof LayoutList
      trackerView: 'list' | 'detail'
      updatedAt: string
      href: string
      trackerHrefs: {
        trackerPageHref: string
        schemaEditHref: string
        listHref: string | null
        bindingsHref: string
        validationsHref: string
        calculationsHref: string
        dependsOnHref: string
      }
    })[] = []

    if (hasProjectConfigs) {
      rows.push({
        kind: 'file',
        id: 'configs-folder',
        label: 'Configs',
        sublabel: '',
        icon: Folder,
        updatedAt: project.updatedAt,
        href: `${base}/${projectId}/Configs`,
      })
    }
    const moduleRows = modules.map((mod) => {
      const trackerCount = mod.trackerSchemas.filter((t) => t.type === 'GENERAL').length
      return {
        kind: 'module' as const,
        id: mod.id,
        label: mod.name || 'Untitled module',
        sublabel: `${trackerCount} tracker${trackerCount !== 1 ? 's' : ''}`,
        icon: Folder,
        updatedAt: mod.updatedAt,
        href: `${base}/${projectId}/module/${mod.id}`,
      }
    })
    const trackerRows = projectLevelTrackers.map((tracker) => {
      const parentId = tracker.listForSchemaId ?? tracker.id
      const isListView = tracker.listForSchemaId != null
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
        icon: isListView ? LayoutList : FileText,
        trackerView: isListView ? 'list' as const : 'detail' as const,
        updatedAt: tracker.updatedAt,
        href: tracker.listForSchemaId ? `/tracker-list/${tracker.id}` : `/tracker/${tracker.id}`,
        trackerHrefs: {
          trackerPageHref: `/tracker/${parentId}`,
          schemaEditHref: `/tracker/${parentId}/edit`,
          listHref,
          bindingsHref: `/tracker/${parentId}/bindings`,
          validationsHref: `/tracker/${parentId}/validations`,
          calculationsHref: `/tracker/${parentId}/calculations`,
          dependsOnHref: `/tracker/${parentId}/depends-on`,
        },
      }
    })
    return [...rows, ...moduleRows, ...trackerRows]
  }, [pathname, projectId, project, modules, projectLevelTrackers, hasProjectConfigs])

  const handleTrackerCreated = useCallback(
    async (trackerId: string) => {
      await fetchProjects()
      invalidateProjectAndProjects()
      router.push(`/tracker/${trackerId}/edit?new=true`)
    },
    [fetchProjects, invalidateProjectAndProjects, router],
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
        <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-3 gap-3 bg-background/80">
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
          <CreateDropdown
            projectId={projectId}
            variant="toolbar"
            onError={(msg) => setErrorMessage(msg || null)}
            onTrackerCreated={handleTrackerCreated}
          />
        </div>

        <div className="flex-1 overflow-auto px-3 sm:px-4 py-6">
          <div className="h-full min-h-0">
            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center border border-dashed border-border/35">
                  <FileText className="h-8 w-8 opacity-45" />
                </div>
                <p className="text-xs font-medium">This folder is empty</p>
                <CreateDropdown
                  projectId={projectId}
                  variant="empty"
                  onError={(msg) => setErrorMessage(msg || null)}
                  onTrackerCreated={handleTrackerCreated}
                />
              </div>
            ) : (
              <div
                className="grid w-full grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-4 sm:gap-6 content-start"
                aria-label="Project items"
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
                      key={row.kind === 'file' ? `file-${row.id}` : `${row.kind}-${row.id}`}
                      className="relative flex flex-col items-center gap-3 min-w-0 w-full group/card"
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
                        className="group flex flex-col items-center gap-3 rounded-2xl p-4 w-full hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-colors"
                      >
                        <div
                          className={`${TILE_ICON_SHELL} ${
                            'trackerView' in row && row.trackerView === 'list'
                              ? 'border-primary/35 bg-primary/8'
                              : ''
                          }`}
                        >
                          <Icon
                            className={`${TILE_ICON} ${
                              'trackerView' in row && row.trackerView === 'list'
                                ? 'text-primary/80'
                                : ''
                            }`}
                          />
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
                          <span className="text-sm font-semibold text-center leading-tight truncate w-full">
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
