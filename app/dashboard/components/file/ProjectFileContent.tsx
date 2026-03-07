'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  PROJECT_FILE_LABELS,
  type Project,
  type ProjectFileType,
} from '../../dashboard-context'
import { dashboardQueryKeys } from '../../query-keys'

const STALE_TIME_MS = 60 * 1000

export function ProjectFileContent({
  initialProject,
  fileId,
  fileType,
}: {
  initialProject: Project
  fileId: string
  fileType: ProjectFileType
}) {
  const params = useParams()
  const router = useRouter()
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

  const file = project?.projectFiles?.find((f) => f.id === fileId)
  const resolvedType = file?.type ?? fileType
  const label = PROJECT_FILE_LABELS[resolvedType]
  const fileNotFound = project && !project.projectFiles?.some((f) => f.id === fileId)

  useEffect(() => {
    if (isError && (error as Error)?.message === 'Not found') {
      router.replace('/dashboard')
    }
  }, [isError, error, router])

  useEffect(() => {
    if (fileNotFound) {
      router.replace(`/dashboard/${projectId}`)
    }
  }, [fileNotFound, router, projectId])

  if (isLoading && !project) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (fileNotFound || (isError && (error as Error)?.message === 'Not found')) {
    return null
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Desktop
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <Link
            href={`/dashboard/${projectId}`}
            className="hover:text-foreground transition-colors"
          >
            Project
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="font-medium text-foreground">{label}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs">Coming soon. Edit and configuration will be available here.</p>
        <Link
          href={`/dashboard/${projectId}`}
          className="text-xs text-primary hover:underline"
        >
          Back to project
        </Link>
      </div>
    </main>
  )
}
