'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TrackerAIView } from '../page'
import { TrackerPageSkeleton } from './TrackerPageSkeleton'
import { TrackerInstanceListView } from '../views/TrackerInstanceListView'
import type { TrackerResponse, Message } from '../hooks/useTrackerChat'

const STORAGE_KEY_PREFIX = 'trckr:tracker:'

type TrackerRecord = {
  id: string
  name: string | null
  schema: unknown
  instance?: string
  versionControl?: boolean
  listForSchemaId?: string | null
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
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const isNew = searchParams.get('new') === 'true'
  const instanceId = searchParams.get('instanceId')
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

  // Load snapshot: if instanceId is specified, load that specific instance;
  // otherwise load the most recent snapshot.
  // Skip if versionControl is on (branch fetching handled in TrackerAIView).
  useEffect(() => {
    if (!id || !state.tracker) return
    if (state.tracker.versionControl) return
    // For list-view schemas, don't pre-load (TrackerInstanceListView handles it)
    if (state.tracker.listForSchemaId) return

    let cancelled = false

    async function fetchSnapshot() {
      try {
        let item: SavedSnapshot | null = null

        if (instanceId && instanceId !== 'new') {
          // Load the specific instance
          const res = await fetch(`/api/trackers/${id}/data/${instanceId}`)
          if (!res.ok || cancelled) return
          const data = await res.json()
          if (data?.id && data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
            item = { id: data.id, label: data.label ?? null, data: data.data, updatedAt: data.updatedAt }
          }
        } else {
          // Load the latest snapshot
          const res = await fetch(`/api/trackers/${id}/data?limit=1`)
          if (!res.ok || cancelled) return
          const data = await res.json()
          const items = data?.items
          if (cancelled || !Array.isArray(items) || items.length === 0) return
          const first = items[0]
          if (first?.id && first?.data && typeof first.data === 'object' && !Array.isArray(first.data)) {
            item = { id: first.id, label: first.label ?? null, data: first.data, updatedAt: first.updatedAt }
          }
        }

        if (!cancelled && item) {
          setLatestSnapshot(item)
        }
      } catch {
        // ignore
      }
    }

    fetchSnapshot()
    return () => { cancelled = true }
  }, [id, state.tracker, instanceId])

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

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }, [router])

  if (!id) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
        <p className="text-muted-foreground">Invalid tracker</p>
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={handleBack}>
          Back
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
      <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
        <p className="text-muted-foreground">Invalid tracker schema</p>
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      </div>
    )
  }

  // If this is a .list companion schema, render the instance list view
  if (state.tracker?.listForSchemaId) {
    return (
      <TrackerInstanceListView
        listSchemaId={id}
        parentTrackerId={state.tracker.listForSchemaId}
        listName={state.tracker.name ?? 'Instances'}
      />
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
      versionControl={state.tracker?.versionControl ?? false}
    />
  )
}
