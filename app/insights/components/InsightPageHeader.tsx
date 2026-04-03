'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type InsightPageHeaderProps = {
 backHref: string
 title: string
 trackerName: string | null
 projectName: string | null
 moduleName: string | null
}

export function InsightPageHeader({
 backHref,
 title,
 trackerName,
 projectName,
 moduleName,
}: InsightPageHeaderProps) {
 return (
 <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <Link
 href={backHref}
 className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2"
 >
 <ArrowLeft className="h-3.5 w-3.5" />
 {projectName ?? 'Project'}
 {moduleName ? ` / ${moduleName}` : ''}
 </Link>
 <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
 <p className="text-xs text-muted-foreground mt-1">
 Tracker: {trackerName?.trim() || 'Untitled'}
 </p>
 </div>
 </div>
 )
}
