'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import {
  ChevronRight,
  FileText,
  Users,
  Settings,
  ScrollText,
  Network,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../../query-keys'
import type { Module, SystemFileType, TrackerSchema } from '../../dashboard-context'
import { buildConfigRows } from './configRows'
import {
  ProjectAreaToolbar,
  ProjectBreadcrumbNav,
  ProjectConfigGridTile,
  ProjectEmptyStatePanel,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbTrailLinkClass,
  projectAreaMainClass,
  projectAreaItemGridClass,
  projectAreaScrollClass,
} from '../project-area'

const STALE_TIME_MS = 60 * 1000

type BreadcrumbItem = { id: string; name: string }

export function ModuleConfigsContent({
  initialModule,
  initialProjectName,
  initialBreadcrumb = [],
}: {
  initialModule: Module
  initialProjectName: string | null
  initialBreadcrumb?: BreadcrumbItem[]
}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const projectId = params.projectId as string
  const moduleId = params.moduleId as string

  const { data: mod, isLoading, isError, error } = useQuery({
    queryKey: dashboardQueryKeys.module(moduleId),
    queryFn: async () => {
      const res = await fetch(`/api/modules/${moduleId}`)
      if (res.status === 404 || !res.ok) throw new Error('Not found')
      return (await res.json()) as Module
    },
    initialData: initialModule,
    staleTime: STALE_TIME_MS,
  })

  useEffect(() => {
    if (isError && (error as Error)?.message === 'Not found') {
      const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
      router.replace(`${base}/${projectId}`)
    }
  }, [isError, error, router, projectId, pathname])

  const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'
  const projectName = initialProjectName ?? null
  const breadcrumb = initialBreadcrumb ?? []

  const moduleSystemFiles: TrackerSchema[] =
    (mod?.trackerSchemas ?? []).filter(
      (t) => t.type === 'SYSTEM' && t.systemType != null,
    )
  const hasConfigs = moduleSystemFiles.length > 0

  const ICONS: Record<SystemFileType, typeof FileText> = {
    TEAMS: Users,
    SETTINGS: Settings,
    RULES: ScrollText,
    CONNECTIONS: Network,
  }

  const rows = hasConfigs
    ? buildConfigRows({
      files: moduleSystemFiles,
      baseHref: '/tracker',
      icons: ICONS,
      sublabel: 'Override',
    })
    : []

  if (isLoading && !mod) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <FileText className="h-10 w-10 text-primary/40" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (!mod) {
    return null
  }

  const moduleHref =
    base === '/project'
      ? `/project/${projectId}/module/${moduleId}`
      : `/dashboard/${projectId}/module/${moduleId}`

  return (
    <main className={projectAreaMainClass}>
      <ProjectAreaToolbar
        breadcrumb={
          <ProjectBreadcrumbNav>
            <Link href="/dashboard" className={projectAreaBreadcrumbTrailLinkClass}>
              Dashboard
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
            <Link
              href={base === '/project' ? `/project/${projectId}` : `/dashboard/${projectId}`}
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
                      href={
                        base === '/project'
                          ? `/project/${projectId}/module/${item.id}`
                          : `/dashboard/${projectId}/module/${item.id}`
                      }
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
            <span className="min-w-0 max-w-[min(50vw,10rem)] truncate font-medium text-foreground">
              {mod.name || 'Untitled module'}
            </span>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
            <span className="shrink-0 font-medium text-foreground">Configs</span>
          </ProjectBreadcrumbNav>
        }
      />

      <div className={projectAreaScrollClass}>
        {!hasConfigs ? (
          <ProjectEmptyStatePanel
            icon={FileText}
            title="No configs yet"
            description="Override configs will show here when defined for this module."
          >
            <Link href={moduleHref} className="text-xs font-medium text-primary hover:underline">
              Back to module
            </Link>
          </ProjectEmptyStatePanel>
        ) : (
          <div
            className={projectAreaItemGridClass}
            aria-label="Module configs"
          >
            {rows.map((row) => {
              const Icon = row.icon
              return (
                <ProjectConfigGridTile
                  key={row.id}
                  icon={Icon}
                  label={row.label}
                  onNavigate={() => router.push(row.href)}
                />
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
