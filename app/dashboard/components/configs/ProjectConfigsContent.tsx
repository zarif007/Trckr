'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { ChevronRight, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../../query-keys'
import type { Project, SystemFileType, TrackerSchema } from '../../dashboard-context'
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

 const projectSystemFiles: TrackerSchema[] =
 (project?.trackerSchemas ?? []).filter(
 (t) => t.type === 'SYSTEM' && !t.moduleId && t.systemType != null,
 )
 const hasConfigs = projectSystemFiles.length > 0

 const ICONS: Record<SystemFileType, typeof FileText> = {
 TEAMS: FileText,
 SETTINGS: FileText,
 RULES: FileText,
 CONNECTIONS: FileText,
 }

 const rows = hasConfigs
 ? buildConfigRows({
 files: projectSystemFiles,
 baseHref: '/tracker',
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

 const projectHref =
 base === '/project' ? `/project/${projectId}` : `/dashboard/${projectId}`

 return (
 <main className={projectAreaMainClass}>
 <ProjectAreaToolbar
 breadcrumb={
 <ProjectBreadcrumbNav>
 <Link href="/dashboard" className={projectAreaBreadcrumbTrailLinkClass}>
 Dashboard
 </Link>
 <ChevronRight className={projectAreaBreadcrumbChevronClass} aria-hidden />
 <Link href={projectHref} className={projectAreaBreadcrumbTrailLinkClass}>
 {project.name || 'Untitled folder'}
 </Link>
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
 description="System files will appear here when your project defines them."
 >
 <Link
 href={projectHref}
 className="text-xs font-medium text-primary hover:underline"
 >
 Back to project
 </Link>
 </ProjectEmptyStatePanel>
 ) : (
 <div
 className={projectAreaItemGridClass}
 aria-label="Project configs"
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
