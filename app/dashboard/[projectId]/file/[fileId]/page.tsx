'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, Loader2 } from 'lucide-react'
import {
  PROJECT_FILE_LABELS,
  type ProjectFileType,
} from '../../../dashboard-context'

export default function DashboardProjectFilePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const fileId = params.fileId as string

  const [fileType, setFileType] = useState<ProjectFileType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !fileId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (res.status === 404 || !res.ok) {
          if (!cancelled) router.replace('/dashboard')
          return
        }
        const project = await res.json()
        const files = project.projectFiles ?? []
        const file = files.find((f: { id: string }) => f.id === fileId)
        if (!cancelled) {
          if (file) setFileType(file.type)
          else router.replace(`/dashboard/${projectId}`)
        }
      } catch {
        if (!cancelled) router.replace('/dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectId, fileId, router])

  if (loading || !fileType) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  const label = PROJECT_FILE_LABELS[fileType]

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
