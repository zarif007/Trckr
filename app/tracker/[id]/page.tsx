'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrackerDisplay, TrackerDisplayErrorBoundary } from '@/app/components/tracker-display'
import type { TrackerDisplayProps } from '@/app/components/tracker-display'
import { useTrackerNav } from '../TrackerNavContext'

type TrackerRecord = {
  id: string
  name: string | null
  schema: unknown
}

export default function TrackerByIdPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null
  const [tracker, setTracker] = useState<TrackerRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const setTrackerNav = useTrackerNav()?.setTrackerNav ?? null

  useEffect(() => {
    if (!id) return

    let cancelled = false
    async function fetchTracker() {
      try {
        const res = await fetch(`/api/trackers/${id}`)
        if (!res.ok) {
          if (res.status === 404) setError('Tracker not found')
          else setError('Failed to load tracker')
          return
        }
        const data = await res.json()
        if (!cancelled) setTracker(data)
      } catch {
        if (!cancelled) setError('Failed to load tracker')
      }
    }

    fetchTracker()
    return () => {
      cancelled = true
    }
  }, [id])

  // Register tracker name in navbar
  useEffect(() => {
    if (!setTrackerNav || !tracker) return
    const name = tracker.name || 'Untitled tracker'
    setTrackerNav({ name, onNameChange: () => {} })
    return () => setTrackerNav(null)
  }, [setTrackerNav, tracker])

  if (!id) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-4 pt-24">
        <p className="text-muted-foreground">Invalid tracker</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-4 pt-24">
        <p className="text-muted-foreground">{error}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  if (!tracker) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-4 pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading tracker…</p>
      </div>
    )
  }

  const schema = tracker.schema as TrackerDisplayProps
  const hasValidSchema =
    schema &&
    Array.isArray(schema.tabs) &&
    schema.tabs.length > 0 &&
    Array.isArray(schema.sections) &&
    Array.isArray(schema.grids) &&
    Array.isArray(schema.fields)

  if (!hasValidSchema) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-4 pt-24">
        <p className="text-muted-foreground">Invalid tracker schema</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-col pt-16 md:pt-20">
      <div className="flex-1 px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/tracker">New tracker</Link>
          </Button>
        </div>
        <TrackerDisplayErrorBoundary>
          <TrackerDisplay
            tabs={schema.tabs}
            sections={schema.sections}
            grids={schema.grids}
            fields={schema.fields}
            layoutNodes={schema.layoutNodes}
            bindings={schema.bindings}
            validations={schema.validations}
            calculations={schema.calculations}
            styles={schema.styles}
            dependsOn={schema.dependsOn}
            dynamicOptions={schema.dynamicOptions}
          />
        </TrackerDisplayErrorBoundary>
      </div>
    </div>
  )
}
