'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { ChevronRight, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../../query-keys'
import type { Project, ProjectFileType } from '../../dashboard-context'
import { buildConfigRows } from './configRows'

const STALE_TIME_MS = 60 * 1000

export function ProjectConfigsContent({
  initialProject,
}: {
  initialProject: Project
}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const projectId = params.projectId as string

  const { data: project, isLoading, isError, error } = useQuery({
    queryKey: dashboardQueryKeys.project(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.status === 404 || !res.ok) throw new Error('Not found')
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

  const base = pathname.startsWith('/project/') ? '/project' : '/dashboard'

  const projectFiles = project?.projectFiles ?? []
  const hasConfigs = projectFiles.length > 0

  const ICONS: Record<ProjectFileType, typeof FileText> = {
    TEAMS: FileText,
    SETTINGS: FileText,
    RULES: FileText,
    CONNECTIONS: FileText,
  }

  const rows = hasConfigs
    ? buildConfigRows({
      files: projectFiles,
      baseHref: `${base}/${projectId}`,
      icons: ICONS,
      sublabel: '',
    })
    : []

  if (isLoading && !project) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <FileText className="h-10 w-10 text-primary/40" />
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
    <main className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-3 gap-3 bg-background/80">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <Link
            href={base === '/project' ? `/project/${projectId}` : `/dashboard/${projectId}`}
            className="hover:text-foreground transition-colors"
          >
            {project.name || 'Untitled folder'}
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="font-medium text-foreground">Configs</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6">
        {!hasConfigs ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center border border-dashed border-border/35">
              <FileText className="h-8 w-8 opacity-45" />
            </div>
            <p className="text-xs font-medium">No configs yet</p>
            <Link
              href={base === '/project' ? `/project/${projectId}` : `/dashboard/${projectId}`}
              className="text-xs text-primary hover:underline"
            >
              Back to project
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6 w-fit" aria-label="Project configs">
            {rows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.id}
                  className="relative flex flex-col items-center gap-3 w-[7rem] flex-shrink-0 group/card"
                >
                  <button
                    type="button"
                    onClick={() => {
                      router.push(row.href)
                    }}
                    className="group flex flex-col items-center gap-3 rounded-2xl p-4 w-full hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-muted/45 border border-border/40 shadow-sm flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:border-primary/35 group-hover:bg-primary/8 group-hover:shadow-md">
                      <Icon className="h-7 w-7 text-foreground/75 transition-colors group-hover:text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-center leading-tight truncate w-full">
                      {row.label}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

