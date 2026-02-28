'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Plus, FolderOpen, LayoutGrid, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type TrackerSchema = {
  id: string
  name: string | null
  projectId: string
  instance: string
  createdAt: string
  updatedAt: string
}

type Project = {
  id: string
  name: string | null
  userId: string
  createdAt: string
  updatedAt: string
  trackerSchemas: TrackerSchema[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return

    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects')
        if (!res.ok) {
          if (res.status === 401) return
          throw new Error('Failed to load projects')
        }
        const data = await res.json()
        setProjects(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [status])

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-4 pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-6 pt-20 px-4">
        <p className="text-muted-foreground text-center">
          Sign in to view your projects and trackers.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pt-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Your projects and trackers
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 gap-2">
            <Link href="/tracker">
              <Plus className="h-4 w-4" />
              New
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {projects.length === 0 && !error && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                No projects yet
              </CardTitle>
              <CardDescription>
                Create your first tracker with AI. Click New to describe what you want to track and we&apos;ll build it for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/tracker" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New tracker
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {projects.length > 0 && (
          <ul className="space-y-6">
            {projects.map((project) => (
              <li key={project.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {project.name || 'Untitled project'}
                    </CardTitle>
                    <CardDescription>
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.trackerSchemas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No trackers in this project.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {project.trackerSchemas.map((tracker) => (
                          <li
                            key={tracker.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium">
                              {tracker.name || 'Untitled tracker'}
                            </span>
                            <Button asChild variant="ghost" size="sm" className="h-7 ml-auto text-xs">
                              <Link href={`/tracker/${tracker.id}`}>
                                View
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
