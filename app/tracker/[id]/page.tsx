'use client'

import React, { use, Suspense, useEffect, useState, useCallback } from 'react'
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
  latestSnapshot: {
    id: string
    label: string | null
    data: Record<string, Array<Record<string, unknown>>>
    updatedAt?: string
    formStatus?: string | null
  } | null
}

/** Merge tracker.name into schema so the view and top bar show the correct name. */
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

    let tracker: TrackerRecord
    let schema: TrackerResponse
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

    const latestSnapshot = await (async () => {
      if (instanceId && instanceId !== 'new') {
        const res = await fetch(`/api/trackers/${id}/data/${instanceId}`)
        if (!res.ok) return null
        const row = (await res.json()) as {
          id?: string
          label?: string | null
          data?: Record<string, Array<Record<string, unknown>>> | null
          updatedAt?: string
          formStatus?: string | null
        }
        if (!row?.id || !row?.data) return null
        return {
          id: row.id,
          label: row.label ?? null,
          data: row.data,
          updatedAt: row.updatedAt,
          formStatus: row.formStatus ?? null,
        }
      }
      // For MULTI trackers, opening the tracker without an explicit instance
      // should start from a fresh draft. Existing instances are opened only
      // when a concrete instanceId is selected.
      if (tracker.instance === 'MULTI' || instanceId === 'new') return null
      const res = await fetch(`/api/trackers/${id}/data?limit=1`)
      if (!res.ok) return null
      const payload = (await res.json()) as {
        items?: Array<{
          id?: string
          label?: string | null
          data?: Record<string, Array<Record<string, unknown>>> | null
          updatedAt?: string
          formStatus?: string | null
        }>
      }
      const row = payload.items?.[0]
      if (!row?.id || !row?.data) return null
      return {
        id: row.id,
        label: row.label ?? null,
        data: row.data,
        updatedAt: row.updatedAt,
        formStatus: row.formStatus ?? null,
      }
    })().catch(() => null)

    return { tracker, schema, latestSnapshot }
  })()

  trackerCache.set(key, p)
  return p
}

function TrackerByIdContent({
  id,
  isNew,
  instanceId,
  initialBranchName,
  onBranchChange,
  onBack,
}: {
  id: string
  isNew: boolean
  instanceId: string | null
  initialBranchName: string | null
  onBranchChange: (branchName: string) => void
  onBack: () => void
}) {
  const initial = use(getTrackerResource(id, instanceId))
  const [state, setState] = useState<TrackerResource>(initial)
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: null,
    messages: [],
  })

  // Load conversation for this tracker once we have the tracker
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function fetchConversation() {
      try {
        const res = await fetch(`/api/trackers/${id}/conversation?mode=ANALYST`)
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
      const next: TrackerResource = {
        tracker: data,
        schema: schemaWithTrackerName(data),
        latestSnapshot: state.latestSnapshot,
      }
      setState(next)
      const key = `${id}::${instanceId ?? ''}`
      trackerCache.set(key, Promise.resolve(next))
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

  // If this is a .list companion schema, render the instance list view
  if (state.tracker?.listForSchemaId) {
    return (
      <TrackerInstanceListView
        listSchemaId={id}
        parentTrackerId={state.tracker.listForSchemaId}
        listName={getListDisplayName(state.tracker.name)}
      />
    )
  }

  return (
    <TrackerAIView
      initialSchema={schema}
      initialGridData={state.latestSnapshot?.data ?? null}
      initialFormStatus={state.latestSnapshot?.formStatus ?? null}
      onSaveTracker={handleSaveTracker}
      initialEditMode={false}
      initialChatOpen={false}
      trackerId={id}
      instanceType={state.tracker?.instance === 'MULTI' ? 'MULTI' : 'SINGLE'}
      instanceId={instanceId}
      autoSave={state.tracker?.autoSave ?? true}
      initialConversationId={conversation.conversationId}
      initialMessages={conversation.messages.length > 0 ? conversation.messages : undefined}
      versionControl={state.tracker?.versionControl ?? false}
      initialBranchName={initialBranchName}
      onBranchChange={onBranchChange}
      pageMode="data"
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

export default function TrackerByIdPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const isNew = searchParams.get('new') === 'true'
  const instanceId = searchParams.get('instanceId')
  const branchFromUrl = searchParams.get('branch')

  const handleBranchChange = useCallback(
    (branchName: string) => {
      if (!id) return
      const next = new URLSearchParams(searchParams.toString())
      if (branchName) {
        next.set('branch', branchName)
      } else {
        next.delete('branch')
      }
      const qs = next.toString()
      router.replace(`/tracker/${id}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [id, router, searchParams]
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

  return (
    <Suspense fallback={<TrackerPageSkeleton />}>
      <TrackerErrorBoundary onBack={handleBack}>
        <TrackerByIdContent
          id={id}
          isNew={isNew}
          instanceId={instanceId}
          initialBranchName={branchFromUrl}
          onBranchChange={handleBranchChange}
          onBack={handleBack}
        />
      </TrackerErrorBoundary>
    </Suspense>
  )
}
