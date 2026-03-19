'use client'

import React, { use, Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TrackerAIView } from '../../page'
import { TrackerPageSkeleton } from '../TrackerPageSkeleton'
import { TrackerInstanceListView } from '../../views/TrackerInstanceListView'
import type { TrackerResponse, Message } from '../../hooks/useTrackerChat'

const STORAGE_KEY_PREFIX = 'trckr:tracker:'

type TrackerRecord = {
  id: string
  name: string | null
  schema: unknown
  instance?: string
  versionControl?: boolean
  autoSave?: boolean
  listForSchemaId?: string | null
}

type ConversationState = {
  conversationId: string | null
  messages: Message[]
}

type TrackerResource = {
  tracker: TrackerRecord
  schema: TrackerResponse
}

function schemaWithTrackerName(data: TrackerRecord): TrackerResponse {
  const base = (data.schema ?? {}) as TrackerResponse
  const name = data.name ?? base?.name ?? null
  if (name != null) return { ...base, name }
  return base
}

function getListDisplayName(name: string | null): string {
  if (!name) return 'Instances'
  return name.endsWith('.list') ? name.slice(0, -5) : name
}

const trackerCache = new Map<string, Promise<TrackerResource>>()

function getTrackerResource(id: string, instanceId: string | null): Promise<TrackerResource> {
  const key = `${id}::${instanceId ?? ''}`
  let p = trackerCache.get(key)
  if (p) return p

  p = (async () => {
    let tracker: TrackerRecord
    let schema: TrackerResponse

    let fromStorage: TrackerRecord | null = null
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + id)
      if (raw) {
        try {
          fromStorage = JSON.parse(raw) as TrackerRecord
          sessionStorage.removeItem(STORAGE_KEY_PREFIX + id)
        } catch {
          fromStorage = null
        }
      }
    }

    if (fromStorage) {
      tracker = fromStorage
      schema = schemaWithTrackerName(tracker)
    } else {
      const res = await fetch(`/api/trackers/${id}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('NOT_FOUND')
        throw new Error('FAILED')
      }
      const data = (await res.json()) as TrackerRecord
      tracker = data
      schema = schemaWithTrackerName(tracker)
    }

    return { tracker, schema }
  })()

  trackerCache.set(key, p)
  return p
}

function TrackerByIdEditContent({
  id,
  isNew,
  instanceId,
  onBack,
  conversationIdParam,
}: {
  id: string
  isNew: boolean
  instanceId: string | null
  onBack: () => void
  conversationIdParam: string | null
}) {
  const initial = use(getTrackerResource(id, instanceId))
  const [state, setState] = useState<TrackerResource>(initial)
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: null,
    messages: [],
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function fetchConversation() {
      try {
        const url = conversationIdParam
          ? `/api/trackers/${id}/conversation?mode=BUILDER&conversationId=${conversationIdParam}`
          : `/api/trackers/${id}/conversation?mode=BUILDER`
        const res = await fetch(url)
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
  }, [id, conversationIdParam])

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
      const key = `${id}::${instanceId ?? ''}`
      // Keep save behavior silent in edit mode: persist to server/cache
      // without updating parent page state, which can feel like a refresh.
      trackerCache.set(
        key,
        Promise.resolve({
          tracker: data,
          schema: schemaWithTrackerName(data),
        })
      )
    },
    [id, instanceId, state.tracker?.name]
  )

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
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    )
  }

  if (state.tracker?.listForSchemaId) {
    return (
      <TrackerInstanceListView
        listSchemaId={id}
        parentTrackerId={state.tracker.listForSchemaId}
        listName={getListDisplayName(state.tracker.name)}
      />
    )
  }

  const primaryNavAction = useMemo(
    () => ({ label: 'Open Tracker', href: `/tracker/${id}` }),
    [id]
  )

  return (
    <TrackerAIView
      initialSchema={schema}
      onSaveTracker={handleSaveTracker}
      initialEditMode
      initialChatOpen={isNew}
      trackerId={id}
      initialConversationId={conversation.conversationId}
      initialMessages={conversation.messages.length > 0 ? conversation.messages : undefined}
      pageMode="schema"
      showPanelUtilities={false}
      schemaAutoSave
      primaryNavAction={primaryNavAction}
      autoSave={state.tracker?.autoSave ?? true}
    />
  )
}

function TrackerLoadError({ error, onBack }: { error: Error; onBack: () => void }) {
  const message = error.message === 'NOT_FOUND' ? 'Tracker not found' : 'Failed to load tracker'
  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-4 pt-24 px-4">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        Back
      </Button>
    </div>
  )
}

class TrackerErrorBoundary extends React.Component<
  { onBack: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  render() {
    if (this.state.error) {
      return <TrackerLoadError error={this.state.error} onBack={this.props.onBack} />
    }
    return this.props.children
  }
}

export default function TrackerEditByIdPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const isNew = searchParams.get('new') === 'true'
  const instanceId = searchParams.get('instanceId')
  const conversationIdParam = searchParams.get('conversationId')

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

  return (
    <Suspense fallback={<TrackerPageSkeleton />}>
      <TrackerErrorBoundary onBack={handleBack}>
        <TrackerByIdEditContent
          id={id}
          isNew={isNew}
          instanceId={instanceId}
          onBack={handleBack}
          conversationIdParam={conversationIdParam}
        />
      </TrackerErrorBoundary>
    </Suspense>
  )
}
