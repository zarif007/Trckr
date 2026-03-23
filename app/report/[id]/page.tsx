'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Markdown from 'react-markdown'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Check, ChevronRight, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/app/components/tracker-display/grids/data-table/data-table'
import { ReportMultilinePrompt } from '@/app/report/components/ReportMultilinePrompt'
import type { ReportStreamEvent } from '@/lib/reports/stream-events'
import { cn } from '@/lib/utils'

type ReportMeta = {
  id: string
  name: string
  projectId: string
  moduleId: string | null
  trackerSchemaId: string
  trackerName: string | null
  projectName: string | null
  moduleName: string | null
  definition: {
    userPrompt: string
    status: string
    schemaFingerprint: string | null
    readyAt: string | null
    lastError: string | null
  } | null
  staleDefinition: boolean
}

type ArtifactKind = 'intent' | 'query_plan' | 'formatter_plan' | 'calc_plan'

const ARTIFACT_SAVED_LABEL: Record<ArtifactKind, string> = {
  intent: 'Intent captured',
  query_plan: 'Query plan compiled',
  formatter_plan: 'Formatter ready',
  calc_plan: 'Calculations configured',
}

type TimelineStep = {
  phase: string
  label?: string
  deltas: string[]
  summary?: string
  artifactKind?: ArtifactKind
  rowCount?: number
  columns?: string[]
}

function applyStreamEvent(steps: TimelineStep[], ev: ReportStreamEvent): TimelineStep[] {
  const next = [...steps]
  const lastIdxForPhase = (phase: string) => {
    for (let j = next.length - 1; j >= 0; j--) {
      if (next[j]!.phase === phase) return j
    }
    return -1
  }

  switch (ev.t) {
    case 'phase_start':
      next.push({ phase: ev.phase, label: ev.label, deltas: [] })
      break
    case 'phase_delta': {
      const i = lastIdxForPhase(ev.phase)
      if (i >= 0) {
        const s = next[i]!
        next[i] = { ...s, deltas: [...s.deltas, ev.text] }
      }
      break
    }
    case 'phase_end': {
      const i = lastIdxForPhase(ev.phase)
      if (i >= 0) {
        const s = next[i]!
        next[i] = { ...s, summary: ev.summary }
      }
      break
    }
    case 'artifact': {
      const i = lastIdxForPhase(ev.phase)
      if (i >= 0) {
        const s = next[i]!
        next[i] = { ...s, artifactKind: ev.kind }
      }
      break
    }
    case 'data_preview': {
      const i = next.length - 1
      if (i >= 0) {
        const s = next[i]!
        next[i] = { ...s, rowCount: ev.rowCount, columns: ev.columns }
      }
      break
    }
    default:
      break
  }
  return next
}

function reportTableColumnKeys(rows: Record<string, unknown>[]): string[] {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('__'))
  return keys
}

function buildReportDataColumns(
  keys: string[],
): ColumnDef<Record<string, unknown>, unknown>[] {
  return keys.map((key) => ({
    id: key,
    accessorKey: key,
    header: key,
    cell: ({ getValue }) => {
      const v = getValue()
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    },
  }))
}

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [meta, setMeta] = useState<ReportMeta | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [steps, setSteps] = useState<TimelineStep[]>([])
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [preambleMarkdown, setPreambleMarkdown] = useState<string | null>(null)
  const [tableRows, setTableRows] = useState<Record<string, unknown>[] | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  /** Per-step detail panels: only the latest step stays open while streaming; all close when the run finishes. */
  const [stepDetailsOpen, setStepDetailsOpen] = useState<Record<number, boolean>>({})
  /** One auto-replay per navigation to this report id (saved recipe = ready + not stale). */
  const didAutoReplayRef = useRef(false)

  const loadMeta = useCallback(async () => {
    setLoadError(null)
    const res = await fetch(`/api/reports/${id}`)
    if (res.status === 401) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/report/${id}`)}`)
      return
    }
    if (!res.ok) {
      setLoadError('Report not found.')
      return
    }
    const data = (await res.json()) as ReportMeta
    setMeta(data)
    setPrompt(data.definition?.userPrompt ?? '')
  }, [id, router])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    didAutoReplayRef.current = false
  }, [id])

  useEffect(() => {
    if (running && steps.length > 0) {
      const last = steps.length - 1
      setStepDetailsOpen({ [last]: true })
    }
  }, [running, steps.length])

  useEffect(() => {
    if (!running && markdown !== null) setStepDetailsOpen({})
  }, [running, markdown])

  const runStream = useCallback(
    async (opts: { regenerate: boolean }) => {
      setRunning(true)
      setStreamError(null)
      setStepDetailsOpen({})
      setSteps([])
      setMarkdown(null)
      setPreambleMarkdown(null)
      setTableRows(null)
      const body = {
        prompt: prompt.trim(),
        regenerate: opts.regenerate,
      }
      const res = await fetch(`/api/reports/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        setStreamError((j as { error?: string }).error || 'Request failed.')
        setRunning(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            let ev: ReportStreamEvent
            try {
              ev = JSON.parse(line) as ReportStreamEvent
            } catch {
              continue
            }
            if (ev.t === 'final') {
              setMarkdown(ev.markdown)
              if (ev.preambleMarkdown !== undefined) setPreambleMarkdown(ev.preambleMarkdown)
              if (ev.tableRows !== undefined) setTableRows(ev.tableRows)
            } else if (ev.t === 'error') {
              setStreamError(ev.message)
            } else {
              setSteps((prev) => applyStreamEvent(prev, ev))
            }
          }
        }
      } finally {
        setRunning(false)
        void loadMeta()
      }
    },
    [id, prompt, loadMeta],
  )

  useEffect(() => {
    if (!meta || meta.id !== id || didAutoReplayRef.current) return
    const canAutoReplay =
      meta.definition?.status === 'ready' && !meta.staleDefinition
    if (!canAutoReplay) return
    didAutoReplayRef.current = true
    void runStream({ regenerate: false })
  }, [meta, id, runStream])

  const reportColumns = useMemo(() => {
    if (!tableRows?.length) return []
    const keys = reportTableColumnKeys(tableRows)
    return buildReportDataColumns(keys.length > 0 ? keys : Object.keys(tableRows[0]!))
  }, [tableRows])

  const showDataTable = Boolean(tableRows && tableRows.length > 0 && reportColumns.length > 0)
  const proseMarkdown = showDataTable ? (preambleMarkdown ?? '') : (markdown ?? '')

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        {loadError}
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading report…
      </div>
    )
  }

  const canReplay = meta.definition?.status === 'ready' && !meta.staleDefinition
  const needsPrompt =
    !meta.definition ||
    meta.definition.status === 'draft' ||
    meta.definition.status === 'error' ||
    meta.staleDefinition

  const canRunGenerate = Boolean(prompt.trim()) && !running

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canRunGenerate) void runStream({ regenerate: true })
    }
  }

  const backHref = `/project/${meta.projectId}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-20">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {meta.projectName ?? 'Project'}
            {meta.moduleName ? ` / ${meta.moduleName}` : ''}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{meta.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tracker: {meta.trackerName?.trim() || 'Untitled'}
          </p>
        </div>
      </div>

      {meta.staleDefinition && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          The tracker schema changed since this report was generated. Run <strong>Regenerate</strong> to
          rebuild the recipe (intent, query, formatter).
        </div>
      )}

      <div className="mb-6 space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="report-prompt">
          What do you want to see?
        </label>
        <div className="rounded-xl border border-border/50 bg-background shadow-sm overflow-hidden">
          <div className="flex flex-col">
            <ReportMultilinePrompt
              id="report-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder="e.g. Total sales from last month, grouped by region (Shift+Enter for a new line)"
              className="shrink-0"
              disabled={running}
            />
            <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-border/40 bg-muted/20">
              {canReplay && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={running}
                  onClick={() => void runStream({ regenerate: false })}
                  className="rounded-lg mr-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Run saved recipe
                </Button>
              )}
              <Button
                type="button"
                size="default"
                disabled={!canRunGenerate}
                onClick={() => void runStream({ regenerate: true })}
                className="rounded-lg gap-2"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {needsPrompt ? 'Generate' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </div>
        {meta.definition?.lastError && !running && (
          <p className="text-xs text-destructive">Last error: {meta.definition.lastError}</p>
        )}
        {streamError && <p className="text-xs text-destructive">{streamError}</p>}
      </div>

      {steps.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Generation details
          </h2>
          <ol className="space-y-2">
            {steps.map((s, idx) => {
              const isLast = idx === steps.length - 1
              const showSpinner = running && isLast
              const detailsOpen = stepDetailsOpen[idx] ?? false
              const hasBody =
                s.deltas.length > 0 ||
                s.rowCount !== undefined ||
                s.artifactKind !== undefined
              return (
                <li
                  key={`${s.phase}-${idx}`}
                  className={cn(
                    'rounded-lg border border-border/40 bg-muted/20 text-sm overflow-hidden',
                    showSpinner && 'ring-1 ring-primary/20 bg-muted/30',
                  )}
                >
                  <details
                    open={detailsOpen}
                    onToggle={(e) => {
                      const el = e.currentTarget
                      setStepDetailsOpen((prev) => ({ ...prev, [idx]: el.open }))
                    }}
                  >
                    <summary
                      className={cn(
                        'cursor-pointer list-none flex items-start gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden',
                        hasBody ? 'hover:bg-muted/40' : 'cursor-default',
                      )}
                      onClick={(e) => {
                        if (!hasBody) e.preventDefault()
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          detailsOpen && 'rotate-90',
                          !hasBody && 'opacity-0 pointer-events-none',
                        )}
                        aria-hidden
                      />
                      <span className="mt-0.5 shrink-0 text-muted-foreground">
                        {showSpinner ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600/80 dark:text-emerald-400/90" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="font-medium text-foreground/90 font-mono text-xs tracking-tight">
                          {s.label ?? s.phase}
                        </div>
                        {s.summary ? (
                          <p className="mt-0.5 text-xs text-muted-foreground font-sans font-normal line-clamp-2">
                            {s.summary}
                          </p>
                        ) : null}
                      </div>
                    </summary>
                    {hasBody && (
                      <div className="border-t border-border/30 bg-muted/10 px-3 py-2.5 pl-[2.75rem] space-y-2">
                        {s.deltas.length > 0 && (
                          <ul className="space-y-0.5 text-xs text-muted-foreground list-none pl-0 font-mono leading-snug opacity-90">
                            {s.deltas.map((d, i) => (
                              <li key={i} className="border-l-2 border-primary/25 pl-2">
                                {d}
                              </li>
                            ))}
                          </ul>
                        )}
                        {s.rowCount !== undefined && (
                          <p
                            className="text-xs text-muted-foreground"
                            title={
                              s.columns && s.columns.length > 0 ? s.columns.join(', ') : undefined
                            }
                          >
                            Prepared <strong className="font-medium text-foreground/80">{s.rowCount}</strong>{' '}
                            row{s.rowCount === 1 ? '' : 's'}
                            {s.columns && s.columns.length > 0 ? (
                              <span className="text-muted-foreground/70"> · hover for fields</span>
                            ) : null}
                          </p>
                        )}
                        {s.artifactKind !== undefined && (
                          <p className="text-xs text-primary/90">{ARTIFACT_SAVED_LABEL[s.artifactKind]}</p>
                        )}
                      </div>
                    )}
                  </details>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {running && steps.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting…
        </div>
      )}

      {markdown && (
        <div className="border-t border-border/40 pt-8 space-y-6">
          {proseMarkdown.trim().length > 0 && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{proseMarkdown}</Markdown>
            </div>
          )}
          {showDataTable && tableRows && (
            <div className="w-full min-w-0">
              <DataTable<Record<string, unknown>, unknown>
                columns={reportColumns}
                data={tableRows}
                addable={false}
                editable={false}
                deletable={false}
                editLayoutAble={false}
                showRowDetails={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
