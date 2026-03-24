'use client'

import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import {
  Loader2,
  X,
  FileText,
  BarChart2,
  Table2,
  LayoutList,
  Folder,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import type { Module, Project, SystemFileType } from '../../dashboard-context'
import { useDashboard } from '../../dashboard-context'
import {
  useRenameDeleteContextMenu,
  RenameDeleteContextMenuPortal,
  type ContextMenuItem,
} from '../../hooks/useRenameDeleteContextMenu'
import { dashboardQueryKeys } from '../../query-keys'
import { CreateDropdown } from '../CreateDropdown'
import { type ConfigTileRow } from '../configs/configRows'
import {
  ProjectAreaToolbar,
  ProjectBreadcrumbNav,
  ProjectEmptyStatePanel,
  ProjectFolderTileIcon,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbCrumbClass,
  projectAreaBreadcrumbInputClass,
  projectAreaBreadcrumbTrailLinkClass,
  projectAreaErrorDismissClass,
  projectAreaErrorToastClass,
  projectAreaFooterClass,
  projectAreaItemGridClass,
  projectAreaMainClass,
  projectAreaScrollClass,
  projectAreaTileButtonMotion,
  projectAreaTileCardClass,
  projectAreaTileMotionButtonClass,
  projectAreaTileOverflowButtonClass,
} from '../project-area'

const ALL_FILE_TYPES: SystemFileType[] = ['TEAMS', 'SETTINGS', 'RULES', 'CONNECTIONS']

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
  const pathname = usePathname()
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

  const { data: projectForReports } = useQuery({
    queryKey: dashboardQueryKeys.project(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to load project')
      return res.json() as Promise<Project>
    },
    staleTime: STALE_TIME_MS,
  })

  const moduleReports = useMemo(
    () =>
      (projectForReports?.reports ?? []).filter((r) => r.moduleId === moduleId),
    [projectForReports?.reports, moduleId],
  )

  const moduleAnalyses = useMemo(
    () =>
      (projectForReports?.analyses ?? []).filter((a) => a.moduleId === moduleId),
    [projectForReports?.analyses, moduleId],
  )

  useEffect(() => {
    if (isError && (error as Error)?.message === 'Not found') {
      const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
      router.replace(`${base}/${projectId}`)
    }
  }, [isError, error, router, projectId, pathname])

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

  // Legacy stub: creation is handled by CreateDropdown; kept so stale closures (e.g. HMR) don’t throw
  const handleCreateSubmodule = useCallback(() => { }, [])

  const onRename = useCallback(
    async (kind: ContextMenuItem['kind'], id: string, newName: string) => {
      if (kind === 'module') {
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
      } else if (kind === 'report') {
        const res = await fetch(`/api/reports/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename report')
      } else if (kind === 'analysis') {
        const res = await fetch(`/api/analyses/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        })
        if (!res.ok) throw new Error('Failed to rename analysis')
      }
      invalidateModuleAndProjects()
      await fetchProjects()
    },
    [invalidateModuleAndProjects, fetchProjects],
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
          const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
          router.replace(`${base}/${projectId}`)
        }
      } else if (item.kind === 'tracker') {
        const res = await fetch(`/api/trackers/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete tracker')
        invalidateModuleAndProjects()
        await fetchProjects()
      } else if (item.kind === 'report') {
        const res = await fetch(`/api/reports/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete report')
        invalidateModuleAndProjects()
        await fetchProjects()
      } else if (item.kind === 'analysis') {
        const res = await fetch(`/api/analyses/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete analysis')
        invalidateModuleAndProjects()
        await fetchProjects()
      }
    },
    [
      fetchProjects,
      invalidateModuleAndProjects,
      queryClient,
      router,
      projectId,
      pathname,
      moduleId,
    ],
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
        } else if (kind === 'report') {
          queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
            prev
              ? {
                ...prev,
                reports: prev.reports.map((r) =>
                  r.id === id ? { ...r, name } : r,
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
                  reports: p.reports.map((r) =>
                    r.id === id ? { ...r, name } : r,
                  ),
                },
            ),
          )
        } else if (kind === 'analysis') {
          queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
            prev
              ? {
                ...prev,
                analyses: (prev.analyses ?? []).map((a) =>
                  a.id === id ? { ...a, name } : a,
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
                  analyses: (p.analyses ?? []).map((a) =>
                    a.id === id ? { ...a, name } : a,
                  ),
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
          const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
          router.replace(`${base}/${projectId}`)
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
            const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
            router.replace(`${base}/${projectId}/module/${item.id}`)
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
      if (item.kind === 'report' && projectForReports) {
        const report = projectForReports.reports.find((r) => r.id === item.id)
        if (!report) return
        queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
          prev
            ? {
              ...prev,
              reports: prev.reports.filter((r) => r.id !== item.id),
            }
            : prev,
        )
        setProjects((prev) =>
          prev.map((p) =>
            p.id !== projectId
              ? p
              : {
                ...p,
                reports: p.reports.filter((r) => r.id !== item.id),
              },
          ),
        )
        return () => {
          queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
            prev
              ? { ...prev, reports: [...prev.reports, report] }
              : prev,
          )
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : { ...p, reports: [...p.reports, report] },
            ),
          )
        }
      }
      if (item.kind === 'analysis' && projectForReports) {
        const analysis = (projectForReports.analyses ?? []).find((a) => a.id === item.id)
        if (!analysis) return
        queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
          prev
            ? {
              ...prev,
              analyses: (prev.analyses ?? []).filter((a) => a.id !== item.id),
            }
            : prev,
        )
        setProjects((prev) =>
          prev.map((p) =>
            p.id !== projectId
              ? p
              : {
                ...p,
                analyses: (p.analyses ?? []).filter((a) => a.id !== item.id),
              },
          ),
        )
        return () => {
          queryClient.setQueryData<Project>(dashboardQueryKeys.project(projectId), (prev) =>
            prev
              ? { ...prev, analyses: [...(prev.analyses ?? []), analysis] }
              : prev,
          )
          setProjects((prev) =>
            prev.map((p) =>
              p.id !== projectId
                ? p
                : { ...p, analyses: [...(p.analyses ?? []), analysis] },
            ),
          )
        }
      }
    },
    [
      mod,
      projectId,
      moduleId,
      queryClient,
      setProjects,
      router,
      pathname,
      projectForReports,
    ],
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

  const moduleSystemFiles = (mod?.trackerSchemas ?? []).filter(
    (t) => t.type === 'SYSTEM' && t.systemType != null,
  )
  const trackerSchemas = (mod?.trackerSchemas ?? []).filter(
    (t) => t.type === 'GENERAL',
  )
  const childModules = mod?.children ?? []
  const hasModuleConfigs = moduleSystemFiles.length > 0
  const totalItems =
    (hasModuleConfigs ? 1 : 0) +
    trackerSchemas.length +
    childModules.length +
    moduleReports.length +
    moduleAnalyses.length
  const isEmpty = totalItems === 0

  const existingFileTypes = new Set(
    moduleSystemFiles
      .map((f) => f.systemType)
      .filter((value): value is SystemFileType => value != null),
  )
  const availableFileTypes = ALL_FILE_TYPES.filter((t) => !existingFileTypes.has(t))

  const tableRows = useMemo(() => {
    if (!mod) return []
    const listCompanionByParent = new Map(
      trackerSchemas
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
      icon: typeof Table2 | typeof LayoutList
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
    } | {
      kind: 'report'
      id: string
      label: string
      sublabel: string
      icon: typeof FileText
      updatedAt: string
      href: string
    } | {
      kind: 'analysis'
      id: string
      label: string
      sublabel: string
      icon: typeof BarChart2
      updatedAt: string
      href: string
    })[] = []

    if (hasModuleConfigs) {
      rows.push({
        kind: 'file',
        id: 'configs-folder',
        label: 'Configs',
        sublabel: 'Module configs',
        icon: Folder,
        updatedAt: mod.updatedAt,
        href: `${base}/${projectId}/module/${moduleId}/configs`,
      })
    }
    const moduleRows = childModules.map((child) => {
      const trackerCount = child.trackerSchemas.filter((t) => t.type === 'GENERAL').length
      return {
        kind: 'module' as const,
        id: child.id,
        label: child.name || 'Untitled module',
        sublabel: `${trackerCount} tracker${trackerCount !== 1 ? 's' : ''}`,
        icon: Folder,
        updatedAt: child.updatedAt,
        href: `${base}/${projectId}/module/${child.id}`,
      }
    })
    const trackerRows = trackerSchemas.map((tracker) => {
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
        icon: isListView ? LayoutList : Table2,
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
    const reportRows = moduleReports.map((r) => ({
      kind: 'report' as const,
      id: r.id,
      label: r.name?.trim() || 'Untitled report',
      sublabel: 'Report',
      icon: FileText,
      updatedAt: r.updatedAt,
      href: `/report/${r.id}`,
    }))
    const analysisRows = moduleAnalyses.map((a) => ({
      kind: 'analysis' as const,
      id: a.id,
      label: a.name?.trim() || 'Untitled analysis',
      sublabel: 'Analysis',
      icon: BarChart2,
      updatedAt: a.updatedAt,
      href: `/analysis/${a.id}`,
    }))
    return [...rows, ...moduleRows, ...trackerRows, ...reportRows, ...analysisRows]
  }, [
    pathname,
    projectId,
    moduleId,
    mod,
    childModules,
    trackerSchemas,
    moduleReports,
    moduleAnalyses,
    hasModuleConfigs,
  ])

  const handleTrackerCreated = useCallback(
    async (trackerId: string) => {
      invalidateModuleAndProjects()
      await fetchProjects()
      router.push(`/tracker/${trackerId}/edit?new=true`)
    },
    [invalidateModuleAndProjects, fetchProjects, router],
  )

  const handleReportCreated = useCallback(async () => {
    invalidateModuleAndProjects()
    await fetchProjects()
  }, [invalidateModuleAndProjects, fetchProjects])

  const handleAnalysisCreated = useCallback(async () => {
    invalidateModuleAndProjects()
    await fetchProjects()
  }, [invalidateModuleAndProjects, fetchProjects])

  const handleAddConfig = async (type: SystemFileType) => {
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
      <main className={projectAreaMainClass}>
        <ProjectAreaToolbar
          breadcrumb={
            <ProjectBreadcrumbNav>
            <Link href="/dashboard" className={projectAreaBreadcrumbTrailLinkClass}>
              Dashboard
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
            <Link
              href={pathname.startsWith('/project/') ? `/project/${projectId}` : `/dashboard/${projectId}`}
              className={projectAreaBreadcrumbTrailLinkClass}
            >
              {projectName || 'Untitled folder'}
            </Link>
            {breadcrumb.length > 0 ? (
              <>
                {breadcrumb.slice(0, -1).map((item) => (
                  <span key={item.id} className="flex shrink-0 items-center gap-2">
                    <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
                    <Link
                      href={pathname.startsWith('/project/') ? `/project/${projectId}/module/${item.id}` : `/dashboard/${projectId}/module/${item.id}`}
                      className={projectAreaBreadcrumbTrailLinkClass}
                    >
                      {item.name}
                    </Link>
                  </span>
                ))}
                <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
              </>
            ) : (
              <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
            )}
            {renaming?.kind === 'module' && renaming.id === mod.id ? (
              <Input
                ref={renameInputRef}
                className={projectAreaBreadcrumbInputClass}
                defaultValue={renaming.currentName}
                onBlur={(e) => submitRename(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={projectAreaBreadcrumbCrumbClass}
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
            </ProjectBreadcrumbNav>
          }
          actions={
            <CreateDropdown
              projectId={projectId}
              moduleId={moduleId}
              variant="toolbar"
              onError={(msg) => setErrorMessage(msg || null)}
              onTrackerCreated={handleTrackerCreated}
              onReportCreated={handleReportCreated}
              onAnalysisCreated={handleAnalysisCreated}
              availableConfigTypes={availableFileTypes}
              onAddConfig={handleAddConfig}
              addingConfig={addingConfig}
            />
          }
        />

        <div className={projectAreaScrollClass}>
          <div className="h-full min-h-0">
            {isEmpty ? (
              <ProjectEmptyStatePanel
                icon={FileText}
                title="This module is empty"
                description="Add trackers, nested modules, or reports from the menu above."
              >
                <CreateDropdown
                  projectId={projectId}
                  moduleId={moduleId}
                  variant="empty"
                  onError={(msg) => setErrorMessage(msg || null)}
                  onTrackerCreated={handleTrackerCreated}
                  onReportCreated={handleReportCreated}
                  onAnalysisCreated={handleAnalysisCreated}
                  availableConfigTypes={availableFileTypes}
                  onAddConfig={handleAddConfig}
                  addingConfig={addingConfig}
                />
              </ProjectEmptyStatePanel>
            ) : (
              <div
                className={projectAreaItemGridClass}
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
                  const canRenameDelete =
                    row.kind === 'module' ||
                    row.kind === 'tracker' ||
                    row.kind === 'report' ||
                    row.kind === 'analysis'
                  return (
                    <div
                      key={
                        row.kind === 'file'
                          ? `file-${row.id}`
                          : `${row.kind}-${row.id}`
                      }
                      className={projectAreaTileCardClass}
                    >
                      <motion.button
                        type="button"
                        {...projectAreaTileButtonMotion}
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
                        className={projectAreaTileMotionButtonClass}
                      >
                        <ProjectFolderTileIcon
                          icon={Icon}
                          listHighlight={
                            'trackerView' in row && row.trackerView === 'list'
                          }
                        />
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
                      </motion.button>
                      {(row.kind === 'tracker' ||
                        row.kind === 'report' ||
                        row.kind === 'analysis') &&
                        !isRenamingThis && (
                        <button
                          type="button"
                          className={projectAreaTileOverflowButtonClass}
                          aria-label={
                            row.kind === 'report'
                              ? 'Report actions'
                              : row.kind === 'analysis'
                                ? 'Analysis actions'
                                : 'Tracker actions'
                          }
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

      <div className={projectAreaFooterClass}>
        <span className="tabular-nums">
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
          className={projectAreaErrorToastClass}
        >
          <span>{displayError}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className={projectAreaErrorDismissClass}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </>
  )
}
