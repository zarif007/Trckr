'use client'

import { useState, useCallback, useMemo, useRef, useEffect, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import {
  X,
  FilePlus,
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
import {
  ProjectAreaToolbar,
  ProjectBreadcrumbNav,
  ProjectEmptyStatePanel,
  ProjectFolderTileIcon,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbCrumbClass,
  projectAreaBreadcrumbInputClass,
  projectAreaBreadcrumbLinkClass,
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
          if (kind === 'report') {
            return {
              ...prev,
              reports: prev.reports.map((r) =>
                r.id === id ? { ...r, name } : r,
              ),
            }
          }
          if (kind === 'analysis') {
            return {
              ...prev,
              analyses: (prev.analyses ?? []).map((a) =>
                a.id === id ? { ...a, name } : a,
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
                modules: updateModuleInTree(p.modules, id, (m) => ({ ...m, name })),
              }
            }
            if (kind === 'report') {
              return {
                ...p,
                reports: p.reports.map((r) =>
                  r.id === id ? { ...r, name } : r,
                ),
              }
            }
            if (kind === 'analysis') {
              return {
                ...p,
                analyses: (p.analyses ?? []).map((a) =>
                  a.id === id ? { ...a, name } : a,
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
      } else if (item.kind === 'report') {
        const res = await fetch(`/api/reports/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete report')
        invalidateProjectAndProjects()
        await fetchProjects()
      } else if (item.kind === 'analysis') {
        const res = await fetch(`/api/analyses/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete analysis')
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
      if (item.kind === 'report' && project) {
        const report = project.reports.find((r) => r.id === item.id)
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
      if (item.kind === 'analysis' && project) {
        const analysis = (project.analyses ?? []).find((a) => a.id === item.id)
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
  const projectLevelReports = useMemo(
    () => (project?.reports ?? []).filter((r) => r.moduleId == null),
    [project?.reports],
  )
  const projectLevelAnalyses = useMemo(
    () => (project?.analyses ?? []).filter((a) => a.moduleId == null),
    [project?.analyses],
  )
  const hasProjectConfigs = projectSystemFiles.length > 0
  const totalItems =
    (hasProjectConfigs ? 1 : 0) +
    modules.length +
    projectLevelTrackers.length +
    projectLevelReports.length +
    projectLevelAnalyses.length
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
    const reportRows = projectLevelReports.map((r) => ({
      kind: 'report' as const,
      id: r.id,
      label: r.name?.trim() || 'Untitled report',
      sublabel: 'Report',
      icon: FileText,
      updatedAt: r.updatedAt,
      href: `/report/${r.id}`,
    }))
    const analysisRows = projectLevelAnalyses.map((a) => ({
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
    project,
    modules,
    projectLevelTrackers,
    projectLevelReports,
    projectLevelAnalyses,
    hasProjectConfigs,
  ])

  const handleTrackerCreated = useCallback(
    async (trackerId: string) => {
      await fetchProjects()
      invalidateProjectAndProjects()
      router.push(`/tracker/${trackerId}/edit?new=true`)
    },
    [fetchProjects, invalidateProjectAndProjects, router],
  )

  const handleReportCreated = useCallback(async () => {
    await fetchProjects()
    invalidateProjectAndProjects()
  }, [fetchProjects, invalidateProjectAndProjects])

  const handleAnalysisCreated = useCallback(async () => {
    await fetchProjects()
    invalidateProjectAndProjects()
  }, [fetchProjects, invalidateProjectAndProjects])

  const displayError = errorMessage ?? (isError && error ? (error as Error).message : null)

  if (loading && !project) {
    return <DashboardPageSkeleton breadcrumbCount={3} />
  }

  if (!project) {
    return null
  }

  return (
    <>
      <main className={projectAreaMainClass}>
        <ProjectAreaToolbar
          breadcrumb={
            <ProjectBreadcrumbNav>
            <Link href="/dashboard" className={projectAreaBreadcrumbLinkClass}>
              Dashboard
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
            {renaming?.kind === 'project' && renaming.id === project.id ? (
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
            </ProjectBreadcrumbNav>
          }
          actions={
            <CreateDropdown
              projectId={projectId}
              variant="toolbar"
              onError={(msg) => setErrorMessage(msg || null)}
              onTrackerCreated={handleTrackerCreated}
              onReportCreated={handleReportCreated}
              onAnalysisCreated={handleAnalysisCreated}
            />
          }
        />

        <div className={projectAreaScrollClass}>
          <div className="h-full min-h-0">
            {isEmpty ? (
              <ProjectEmptyStatePanel
                icon={FilePlus}
                title="This folder is empty"
                description="Add a tracker, module, or report to get started."
              >
                <CreateDropdown
                  projectId={projectId}
                  variant="empty"
                  onError={(msg) => setErrorMessage(msg || null)}
                  onTrackerCreated={handleTrackerCreated}
                  onReportCreated={handleReportCreated}
                  onAnalysisCreated={handleAnalysisCreated}
                />
              </ProjectEmptyStatePanel>
            ) : (
              <div
                className={projectAreaItemGridClass}
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
