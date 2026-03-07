'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrackerAIView } from '../page'
import { TrackerPageSkeleton } from './TrackerPageSkeleton'
import type { TrackerResponse, Message } from '../hooks/useTrackerChat'

const STORAGE_KEY_PREFIX = 'trckr:tracker:'

type TrackerRecord = {
  id: string
  name: string | null
  schema: unknown
}

type ConversationState = {
  conversationId: string | null
  messages: Message[]
}

type SavedSnapshot = {
  id: string
  label: string | null
  data: Record<string, Array<Record<string, unknown>>>
  updatedAt?: string
}

/** Merge tracker.name into schema so the view and top bar show the correct name. */
function schemaWithTrackerName(data: TrackerRecord): TrackerResponse {
  const base = (data.schema ?? {}) as TrackerResponse
  const name = data.name ?? base?.name ?? null
  if (name != null) return { ...base, name }
  return base
}

export default function TrackerByIdPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = typeof params.id === 'string' ? params.id : null
  const isNew = searchParams.get('new') === 'true'
  const [state, setState] = useState<{
    tracker: TrackerRecord | null
    schema: TrackerResponse | null
  }>(() => {
    if (typeof id !== 'string' || typeof sessionStorage === 'undefined') return { tracker: null, schema: null }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_PREFIX + id)
      if (!stored) return { tracker: null, schema: null }
      const data = JSON.parse(stored) as TrackerRecord
      sessionStorage.removeItem(STORAGE_KEY_PREFIX + id)
      return { tracker: data, schema: schemaWithTrackerName(data) }
    } catch {
      return { tracker: null, schema: null }
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: null,
    messages: [],
  })
  const [latestSnapshot, setLatestSnapshot] = useState<SavedSnapshot | null>(null)

  useEffect(() => {
    if (!id) return
    if (state.tracker !== null && state.schema !== null) return
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_PREFIX + id) : null
    if (stored) {
      try {
        const data = JSON.parse(stored) as TrackerRecord
        sessionStorage.removeItem(STORAGE_KEY_PREFIX + id)
        setState({ tracker: data, schema: schemaWithTrackerName(data) })
        return
      } catch {
        // fall through to fetch
      }
    }

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
        if (!cancelled) {
          setState({ tracker: data, schema: schemaWithTrackerName(data) })
        }
      } catch {
        if (!cancelled) setError('Failed to load tracker')
      }
    }

    fetchTracker()
    return () => {
      cancelled = true
    }
  }, [id, state.tracker, state.schema])

  // Load conversation for this tracker once we have the tracker
  useEffect(() => {
    if (!id || !state.tracker) return
    let cancelled = false
    async function fetchConversation() {
      try {
        const res = await fetch(`/api/trackers/${id}/conversation`)
        if (res.status === 404) {
          if (!cancelled) setConversation({ conversationId: null, messages: [] })
          return
        }
        if (!res.ok) {
          if (!cancelled) setConversation({ conversationId: null, messages: [] })
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setConversation({
            conversationId: data.conversation?.id ?? null,
            messages: Array.isArray(data.messages) ? data.messages : [],
          })
        }
      } catch {
        if (!cancelled) setConversation({ conversationId: null, messages: [] })
      }
    }
    fetchConversation()
    return () => {
      cancelled = true
    }
  }, [id, state.tracker])

  // Load latest saved snapshot so the tracker opens with the last saved data
  useEffect(() => {
    if (!id || !state.tracker) return
    let cancelled = false
    async function fetchLatestSnapshot() {
      try {
        const res = await fetch(`/api/trackers/${id}/data?limit=1`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        const items = data?.items
        if (cancelled || !Array.isArray(items) || items.length === 0) return
        const first = items[0]
        if (first?.id && first?.data && typeof first.data === 'object' && !Array.isArray(first.data)) {
          if (!cancelled) {
            setLatestSnapshot({
              id: first.id,
              label: first.label ?? null,
              data: first.data,
              updatedAt: first.updatedAt,
            })
          }
        }
      } catch {
        // ignore
      }
    }
    fetchLatestSnapshot()
    return () => {
      cancelled = true
    }
  }, [id, state.tracker])

  const handleSaveTracker = useCallback(
    async (schema: TrackerResponse) => {
      if (!id) return
      const res = await fetch(`/api/trackers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schema.name ?? state.tracker?.name ?? 'Untitled tracker',
          schema,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save tracker')
      }
      const data = await res.json()
      setState({ tracker: data, schema: schemaWithTrackerName(data) })
    },
    [id, state.tracker?.name]
  )

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

  if (!state.schema || !state.tracker) {
    return <TrackerPageSkeleton />
  }

  const schema = state.schema
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
    <TrackerAIView
      initialSchema={schema}
      onSaveTracker={handleSaveTracker}
      initialEditMode={isNew}
      initialChatOpen={isNew}
      trackerId={id}
      initialConversationId={conversation.conversationId}
      initialMessages={conversation.messages.length > 0 ? conversation.messages : undefined}
      initialLoadedSnapshot={latestSnapshot}
    />
  )
}
