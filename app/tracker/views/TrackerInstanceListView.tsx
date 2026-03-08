'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Plus,
  ExternalLink,
  User,
  Clock,
  FileText,
  List,
  ArrowLeft,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Author {
  id: string
  name: string | null
  email: string | null
}

interface Instance {
  id: string
  label: string | null
  data: Record<string, Array<Record<string, unknown>>>
  branchName: string
  author: Author | null
  authorId: string | null
  createdAt: string
  updatedAt: string
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Returns a quick one-line preview of the instance data.
 * Shows the first grid, first row, first few fields.
 */
function getDataPreview(data: Instance['data']): string {
  const grids = Object.values(data)
  if (!grids.length) return '(empty)'
  const firstGrid = grids[0]
  if (!firstGrid.length) return '(no rows)'
  const row = firstGrid[0]
  const entries = Object.entries(row)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 3)
  if (!entries.length) return '(empty row)'
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
}

function InstanceRow({
  instance,
  index,
  onOpen,
}: {
  instance: Instance
  index: number
  onOpen: (id: string) => void
}) {
  const preview = getDataPreview(instance.data)
  const gridCount = Object.keys(instance.data).length
  const rowCount = Object.values(instance.data).reduce((acc, rows) => acc + rows.length, 0)

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onOpen(instance.id)}
    >
      {/* Index badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-[11px] font-semibold text-muted-foreground tabular-nums">
        {index + 1}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-foreground truncate">
            {instance.label || `Instance ${index + 1}`}
          </span>
          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 tabular-nums">
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 truncate leading-snug">
          {preview}
        </p>
      </div>

      {/* Author */}
      <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/60 min-w-0">
        {instance.author?.name ? (
          <>
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
              {instance.author.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[100px]">{instance.author.name}</span>
          </>
        ) : (
          <User className="h-3 w-3 opacity-50" />
        )}
      </div>

      {/* Timestamp */}
      <div
        className="flex-shrink-0 hidden md:flex items-center gap-1 text-[11px] text-muted-foreground/60"
        title={formatDate(instance.createdAt)}
      >
        <Clock className="h-3 w-3" />
        {formatRelative(instance.createdAt)}
      </div>

      {/* Open action */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen(instance.id) }}
        className="flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100"
        title="Open instance"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface TrackerInstanceListViewProps {
  listSchemaId: string
  parentTrackerId: string
  listName: string
}

export function TrackerInstanceListView({
  listSchemaId,
  parentTrackerId,
  listName,
}: TrackerInstanceListViewProps) {
  const router = useRouter()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const fetchInstances = useCallback(async (pageNum: number = 0) => {
    setLoading(true)
    setError(null)
    try {
      const offset = pageNum * PAGE_SIZE
      const res = await fetch(`/api/trackers/${parentTrackerId}/data?limit=${PAGE_SIZE}&offset=${offset}`)
      if (!res.ok) throw new Error('Failed to load instances')
      const data = await res.json()
      const items: Instance[] = data.items ?? []
      setInstances(items)
      setTotal(data.total ?? items.length)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instances')
    } finally {
      setLoading(false)
    }
  }, [parentTrackerId])

  useEffect(() => {
    fetchInstances(0)
  }, [fetchInstances])

  const handleOpenInstance = useCallback((instanceId: string) => {
    router.push(`/tracker/${parentTrackerId}?instanceId=${instanceId}`)
  }, [router, parentTrackerId])

  const handleNewInstance = useCallback(() => {
    router.push(`/tracker/${parentTrackerId}?instanceId=new`)
  }, [router, parentTrackerId])

  const handleOpenTracker = useCallback(() => {
    router.push(`/tracker/${parentTrackerId}`)
  }, [router, parentTrackerId])

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header bar */}
      <div className="flex-shrink-0 h-10 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleOpenTracker}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            title="Open tracker definition"
          >
            <ArrowLeft className="h-3 w-3" />
            <FileText className="h-3 w-3" />
          </button>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <List className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-[11px] font-semibold truncate">{listName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => fetchInstances(page)}
            disabled={loading}
            className="flex items-center gap-1 h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs rounded-md"
            onClick={handleNewInstance}
          >
            <Plus className="h-3.5 w-3.5" />
            New Instance
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span className="font-semibold">{total}</span>
          <span>instance{total !== 1 ? 's' : ''}</span>
        </div>
        {!loading && instances.length > 0 && (
          <span className="text-[10px] text-muted-foreground/50">
            Showing {instances.length} of {total}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" />
            <p className="text-xs">Loading instances…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchInstances(page)}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && instances.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-dashed border-border/40 flex items-center justify-center">
              <Layers className="h-7 w-7 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">No instances yet</p>
              <p className="text-xs text-muted-foreground/70">
                Create your first instance to start tracking data.
              </p>
            </div>
            <Button size="sm" className="gap-1.5 rounded-full" onClick={handleNewInstance}>
              <Plus className="h-3.5 w-3.5" />
              New Instance
            </Button>
          </div>
        )}

        {!loading && !error && instances.length > 0 && (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <div className="w-8" />
              <div className="flex-1">Label / Preview</div>
              <div className="hidden sm:block w-28">Author</div>
              <div className="hidden md:block w-24">Created</div>
              <div className="w-7" />
            </div>

            {instances.map((instance, i) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                index={i + page * PAGE_SIZE}
                onOpen={handleOpenInstance}
              />
            ))}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchInstances(page - 1)}
                  disabled={page === 0 || loading}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchInstances(page + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total || loading}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 h-6 border-t border-border/50 flex items-center px-3 text-[10px] text-muted-foreground bg-muted/10">
        <span className="flex items-center gap-1">
          <List className="h-2.5 w-2.5" />
          {listName}
        </span>
        <span className="ml-auto tabular-nums">
          {total} instance{total !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
