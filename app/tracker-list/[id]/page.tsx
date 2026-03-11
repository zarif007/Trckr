'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TrackerInstanceListView } from '@/app/tracker/views/TrackerInstanceListView'

type ListTrackerRecord = {
  id: string
  name: string | null
  listForSchemaId: string | null
  instance?: string
}

function getListDisplayName(name: string | null): string {
  if (!name) return 'Instances'
  return name.endsWith('.list') ? name.slice(0, -5) : name
}

function TrackerListContent({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<ListTrackerRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/trackers/${id}`)
        if (res.status === 404) {
          if (!cancelled) setError('List tracker not found')
          return
        }
        if (!res.ok) {
          if (!cancelled) setError('Failed to load list tracker')
          return
        }
        const data = (await res.json()) as ListTrackerRecord
        if (!cancelled) {
          setRecord(data)
        }
      } catch {
        if (!cancelled) setError('Failed to load list tracker')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }, [router])

  if (loading && !record && !error) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <p className="text-xs text-muted-foreground/70">Loading list…</p>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
        <p className="text-muted-foreground text-sm">{error ?? 'Failed to load list tracker'}</p>
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      </div>
    )
  }

  const parentTrackerId =
    record.listForSchemaId ?? (record.instance === 'MULTI' ? record.id : null)

  if (!parentTrackerId) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
        <p className="text-muted-foreground text-sm">This tracker does not have an instance list</p>
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      <TrackerInstanceListView
        listSchemaId={record.id}
        parentTrackerId={parentTrackerId}
        listName={getListDisplayName(record.name)}
      />
    </div>
  )
}

export default function TrackerListByIdPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null

  if (!id) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
        <p className="text-muted-foreground">Invalid list tracker</p>
      </div>
    )
  }

  return <TrackerListContent id={id} />
}

