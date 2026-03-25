'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileDown, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenerationTimeline, GenerationTimelineStarting } from '@/app/insights/components/GenerationTimeline'
import { InsightPageHeader } from '@/app/insights/components/InsightPageHeader'
import { InsightPromptCard } from '@/app/insights/components/InsightPromptCard'
import { StaleDefinitionBanner } from '@/app/insights/components/StaleDefinitionBanner'
import {
  applyPhaseStreamEvent,
  consumeInsightNdjsonStream,
  type GenerationTimelineStep,
} from '@/app/insights/lib/ndjson-timeline'
import { InsightMultilinePrompt } from '@/app/insights/components/InsightMultilinePrompt'
import type { AnalysisDocumentV1 } from '@/lib/analysis/analysis-schemas'
import type { AnalysisStreamEvent } from '@/lib/analysis/stream-events'
import {
  analysisDocumentToMarkdown,
  downloadTextFile,
  sanitizeDownloadBasename,
} from '@/lib/preview-download'

import { AnalysisDocumentView } from '../components/AnalysisDocumentView'

type AnalysisMeta = {
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
  document: AnalysisDocumentV1 | null
}

type ArtifactKind = 'outline' | 'query_plan' | 'document'

const ARTIFACT_SAVED_LABEL: Record<ArtifactKind, string> = {
  outline: 'Outline saved',
  query_plan: 'Query plan saved',
  document: 'Document saved',
}

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [meta, setMeta] = useState<AnalysisMeta | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [steps, setSteps] = useState<GenerationTimelineStep[]>([])
  const [document, setDocument] = useState<AnalysisDocumentV1 | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [stepDetailsOpen, setStepDetailsOpen] = useState<Record<number, boolean>>({})
  const didAutoReplayRef = useRef(false)

  const loadMeta = useCallback(async () => {
    setLoadError(null)
    const res = await fetch(`/api/analyses/${id}`)
    if (res.status === 401) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/analysis/${id}`)}`)
      return
    }
    if (!res.ok) {
      setLoadError('Analysis not found.')
      return
    }
    const data = (await res.json()) as AnalysisMeta
    setMeta(data)
    setPrompt(data.definition?.userPrompt ?? '')
    if (data.document) setDocument(data.document)
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
    if (!running && document !== null) setStepDetailsOpen({})
  }, [running, document])

  const handleStepDetailsOpenChange = useCallback((idx: number, open: boolean) => {
    setStepDetailsOpen((prev) => ({ ...prev, [idx]: open }))
  }, [])

  const runStream = useCallback(
    async (opts: { regenerate: boolean }) => {
      if (opts.regenerate) {
        didAutoReplayRef.current = true
      }
      setRunning(true)
      setStreamError(null)
      setStepDetailsOpen({})
      setSteps([])
      setDocument(null)
      const res = await fetch(`/api/analyses/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          regenerate: opts.regenerate,
        }),
      })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        setStreamError((j as { error?: string }).error || 'Request failed.')
        setRunning(false)
        return
      }

      try {
        await consumeInsightNdjsonStream({
          body: res.body,
          onPhaseEvent: (ev) => setSteps((prev) => applyPhaseStreamEvent(prev, ev)),
          onFinal: (raw) => {
            const ev = raw as AnalysisStreamEvent
            if (ev.t !== 'final') return
            setDocument(ev.document)
          },
          onStreamError: (message) => setStreamError(message),
        })
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
      meta.definition?.status === 'ready' && !meta.staleDefinition && meta.document != null
    if (!canAutoReplay) return
    didAutoReplayRef.current = true
    void runStream({ regenerate: false })
  }, [meta, id, runStream])

  const needsPrompt =
    !meta?.definition ||
    meta.definition.status === 'draft' ||
    meta.definition.status === 'error' ||
    meta.staleDefinition

  const canReplay =
    meta?.definition?.status === 'ready' && !meta.staleDefinition && meta.document != null

  const canRunGenerate = Boolean(prompt.trim()) && !running

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canRunGenerate) void runStream({ regenerate: true })
    }
  }

  const handleDownloadDocument = useCallback(() => {
    if (!document || !meta) return
    const readyAt = meta.definition?.readyAt
    const asOfLabel =
      readyAt && !Number.isNaN(new Date(readyAt).getTime())
        ? new Date(readyAt).toLocaleString(undefined, {
            dateStyle: 'long',
            timeStyle: 'short',
          })
        : null
    const contextLine =
      [meta.projectName, meta.moduleName, meta.trackerName].filter(Boolean).join(' · ') || null
    const md = analysisDocumentToMarkdown({
      title: meta.name,
      asOfLabel,
      contextLine,
      document,
    })
    const base = sanitizeDownloadBasename(meta.name)
    downloadTextFile(`${base}.md`, md, 'text/markdown;charset=utf-8')
  }, [document, meta])

  const backHref = `/project/${meta?.projectId ?? ''}`

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        {loadError}
        <div className="mt-4">
          <Button variant="outline" size="sm" className="rounded-md" onClick={() => router.push('/dashboard')}>
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
        Loading analysis…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6">
      <InsightPageHeader
        backHref={backHref}
        title={meta.name}
        trackerName={meta.trackerName}
        projectName={meta.projectName}
        moduleName={meta.moduleName}
      />

      {meta.staleDefinition && <StaleDefinitionBanner variant="analysis" />}

      <InsightPromptCard
        label="What should this analysis cover?"
        labelHtmlFor="analysis-prompt"
        prompt={
          <InsightMultilinePrompt
            id="analysis-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder="e.g. Summarize trends, highlight risks, and chart volume by category over time"
            className="shrink-0"
            disabled={running}
          />
        }
        footer={
          <>
            {canReplay && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={running}
                onClick={() => void runStream({ regenerate: false })}
                className="rounded-md mr-auto"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh data
              </Button>
            )}
            <Button
              type="button"
              size="default"
              disabled={!canRunGenerate}
              onClick={() => void runStream({ regenerate: true })}
              className="rounded-md gap-2"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {needsPrompt ? 'Generate' : 'Regenerate'}
            </Button>
          </>
        }
        belowCard={
          <>
            {meta.definition?.lastError && !running && (
              <p className="text-xs text-destructive">Last error: {meta.definition.lastError}</p>
            )}
            {streamError && <p className="text-xs text-destructive">{streamError}</p>}
          </>
        }
      />

      <GenerationTimeline
        steps={steps}
        running={running}
        artifactLabels={ARTIFACT_SAVED_LABEL}
        stepDetailsOpen={stepDetailsOpen}
        onStepDetailsOpenChange={handleStepDetailsOpenChange}
      />
      <GenerationTimelineStarting running={running} emptySteps={steps.length === 0} />

      {document && (
        <div className="mt-10 border-t border-border/50 pt-10 space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md gap-1.5"
              onClick={handleDownloadDocument}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download document
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-border/80 bg-card/40 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.07] print:shadow-none print:ring-0">
            <AnalysisDocumentView
              document={document}
              header={{
                title: meta.name,
                asOfIso: meta.definition?.readyAt ?? null,
                projectName: meta.projectName,
                moduleName: meta.moduleName,
                trackerName: meta.trackerName,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
