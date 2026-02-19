'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrackerEmptyState } from '@/app/components/tracker-page/TrackerEmptyState'
import { TrackerMessageList } from '@/app/components/tracker-page/TrackerMessageList'
import { TrackerInputArea } from '@/app/components/tracker-page/TrackerInputArea'
import { TrackerDisplay } from '@/app/components/tracker-display'
import {
  INITIAL_TRACKER_SCHEMA,
} from '@/app/components/tracker-display/tracker-editor'
import { useTrackerChat, type TrackerResponse } from './hooks/useTrackerChat'

const MIN_LEFT_PX = 320
const MIN_RIGHT_PX = 360
const DEFAULT_LEFT_RATIO = 0.75

function TrackerPageContent() {
  return <TrackerAIView />
}

export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen font-sans bg-background text-foreground flex flex-col pt-24 md:pt-40" />
      }
    >
      <TrackerPageContent />
    </Suspense>
  )
}

function TrackerAIView() {
  const {
    input,
    setInput,
    isFocused,
    setIsFocused,
    messages,
    handleSubmit,
    handleContinue,
    applySuggestion,
    setMessageThinkingOpen,
    isLoading,
    error,
    object,
    activeTrackerData,
    setActiveTrackerData,
    generationErrorMessage,
    validationErrors,
    resumingAfterError,
    trackerDataRef,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
  } = useTrackerChat()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftWidth, setLeftWidth] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(true)
  const [schema, setSchema] = useState<TrackerResponse>(
    () => INITIAL_TRACKER_SCHEMA as TrackerResponse
  )

  useEffect(() => {
    if (activeTrackerData) {
      setSchema(activeTrackerData)
    }
  }, [activeTrackerData])

  const handleSchemaChange = useCallback((next: TrackerResponse) => {
    setSchema(next)
    setActiveTrackerData(next)
  }, [setActiveTrackerData])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const clampWidth = () => {
      const rect = container.getBoundingClientRect()
      const fallback = Math.round(rect.width * DEFAULT_LEFT_RATIO)
      setLeftWidth((prev) => {
        const current = prev ?? fallback
        const maxLeft = Math.max(MIN_LEFT_PX, rect.width - MIN_RIGHT_PX)
        return Math.max(MIN_LEFT_PX, Math.min(current, maxLeft))
      })
    }

    clampWidth()
    window.addEventListener('resize', clampWidth)
    return () => window.removeEventListener('resize', clampWidth)
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const maxLeft = Math.max(MIN_LEFT_PX, rect.width - MIN_RIGHT_PX)

    const handleMove = (moveEvent: PointerEvent) => {
      const next = moveEvent.clientX - rect.left
      const clamped = Math.max(MIN_LEFT_PX, Math.min(next, maxLeft))
      setLeftWidth(clamped)
    }

    const handleUp = () => {
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [])

  const hasGeneratedTracker = useMemo(
    () => messages.some((message) => Boolean(message.trackerData)),
    [messages]
  )

  const streamedTracker = useMemo(() => {
    const typed = object as { tracker?: TrackerResponse } | undefined
    return typed?.tracker
  }, [object])

  const isStreamingTracker = Boolean(isLoading && streamedTracker)

  const showStatusPanel =
    Boolean(error) ||
    Boolean(generationErrorMessage) ||
    validationErrors.length > 0 ||
    (!isLoading && messages.length > 0 && !hasGeneratedTracker)

  useEffect(() => {
    if (isStreamingTracker) {
      setEditMode(false)
    }
  }, [isStreamingTracker])

  return (
    <div className="h-screen box-border font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden flex flex-col pt-20 md:pt-20">
      <div ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
        <section
          className={`flex flex-col min-w-[320px] border-r border-border/60 bg-background/60 ${isStreamingTracker ? 'animate-border-blink' : ''}`}
          style={{ width: leftWidth ? `${leftWidth}px` : `${DEFAULT_LEFT_RATIO * 100}%` }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
            {isStreamingTracker && streamedTracker ? (
              <TrackerDisplay
                tabs={((streamedTracker.tabs || []) as unknown[]).filter(
                  (t): t is TrackerResponse['tabs'][number] =>
                    !!t && typeof t === 'object' && 'name' in t && !!(t as { name?: string }).name
                ) as TrackerResponse['tabs']}
                sections={((streamedTracker.sections || []) as unknown[]).filter(
                  (s): s is TrackerResponse['sections'][number] =>
                    !!s && typeof s === 'object' && 'name' in s && !!(s as { name?: string }).name
                ) as TrackerResponse['sections']}
                grids={((streamedTracker.grids || []) as unknown[]).filter(
                  (g): g is TrackerResponse['grids'][number] =>
                    !!g && typeof g === 'object' && 'name' in g && !!(g as { name?: string }).name
                ) as TrackerResponse['grids']}
                fields={((streamedTracker.fields || []) as unknown[]).filter(
                  (f): f is TrackerResponse['fields'][number] =>
                    !!f && typeof f === 'object' && 'ui' in f && !!((f as { ui?: { label?: string } }).ui?.label)
                ) as TrackerResponse['fields']}
                layoutNodes={(streamedTracker.layoutNodes || []) as TrackerResponse['layoutNodes']}
                bindings={(streamedTracker.bindings || {}) as TrackerResponse['bindings']}
                validations={(streamedTracker.validations || {}) as TrackerResponse['validations']}
                styles={(streamedTracker.styles || {}) as TrackerResponse['styles']}
                dependsOn={(streamedTracker.dependsOn || []) as TrackerResponse['dependsOn']}
                getDataRef={trackerDataRef}
              />
            ) : (
              <TrackerDisplay
                tabs={schema.tabs}
                sections={schema.sections}
                grids={schema.grids}
                fields={schema.fields}
                layoutNodes={schema.layoutNodes}
                bindings={schema.bindings}
                validations={schema.validations}
                styles={schema.styles}
                dependsOn={schema.dependsOn}
                getDataRef={trackerDataRef}
                editMode={editMode}
                onSchemaChange={editMode ? handleSchemaChange : undefined}
              />
            )}
          </div>
        </section>

        <div
          className="w-2 shrink-0 cursor-col-resize bg-border/40 hover:bg-border/70 transition-colors"
          onPointerDown={handlePointerDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        />

        <section className="flex-1 min-w-[360px] flex flex-col overflow-hidden bg-background">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mode
              </div>
              <div
                className={`inline-flex rounded-md border border-border/60 bg-background/80 p-0.5 ${isStreamingTracker ? 'opacity-60 pointer-events-none' : ''}`}
                role="group"
                aria-label="Edit or preview mode"
              >
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${!editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={!editMode}
                  disabled={isStreamingTracker}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={editMode}
                  disabled={isStreamingTracker}
                >
                  Edit
                </button>
              </div>
            </div>
            {showStatusPanel && (
              <TrackerStatusPanel
                isLoading={isLoading}
                validationErrors={validationErrors}
                error={error}
                generationErrorMessage={generationErrorMessage}
                resumingAfterError={resumingAfterError}
                onContinue={handleContinue}
                messagesLength={messages.length}
                hasGeneratedTracker={hasGeneratedTracker}
              />
            )}

            <AnimatePresence mode="wait">
              {isChatEmpty ? (
                <TrackerEmptyState
                  key="empty-state"
                  onApplySuggestion={applySuggestion}
                  inputSlot={
                    <TrackerInputArea
                      input={input}
                      setInput={setInput}
                      isFocused={isFocused}
                      setIsFocused={setIsFocused}
                      handleSubmit={handleSubmit}
                      applySuggestion={applySuggestion}
                      isLoading={isLoading}
                      isChatEmpty={isChatEmpty}
                      textareaRef={textareaRef}
                      variant="hero"
                    />
                  }
                />
              ) : (
                <TrackerMessageList
                  key="chat-messages"
                  messages={messages}
                  isLoading={isLoading}
                  object={object}
                  setMessageThinkingOpen={setMessageThinkingOpen}
                  messagesEndRef={messagesEndRef}
                />
              )}
            </AnimatePresence>
          </div>

          {!isChatEmpty && (
            <div className="border-t border-border/60 bg-background/90 backdrop-blur px-4 py-4">
              <TrackerInputArea
                input={input}
                setInput={setInput}
                isFocused={isFocused}
                setIsFocused={setIsFocused}
                handleSubmit={handleSubmit}
                applySuggestion={applySuggestion}
                isLoading={isLoading}
                isChatEmpty={isChatEmpty}
                textareaRef={textareaRef}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function TrackerStatusPanel({
  isLoading,
  validationErrors,
  error,
  generationErrorMessage,
  resumingAfterError,
  onContinue,
  messagesLength,
  hasGeneratedTracker,
}: {
  isLoading: boolean
  validationErrors: string[]
  error: Error | undefined
  generationErrorMessage: string | null
  resumingAfterError: boolean
  onContinue: () => void
  messagesLength: number
  hasGeneratedTracker: boolean
}) {
  const isStreaming = isLoading
  const showNoTracker = messagesLength > 0 && !isStreaming && !hasGeneratedTracker

  return (
    <div
      className={[
        'rounded-md border bg-background/70 backdrop-blur overflow-hidden',
        isStreaming ? 'border-primary/40 animate-border-blink' : 'border-border/60',
      ].join(' ')}
    >
      <div className="p-4 space-y-4">
        {validationErrors.length > 0 && (
          <div className="rounded-md border border-warning/50 bg-warning/10 p-4 text-warning-foreground" role="alert">
            <p className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Schema validation issues
            </p>
            <ul className="text-sm list-disc list-inside space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <p className="text-xs mt-2 text-muted-foreground">You can ask the AI to fix these.</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <p className="font-semibold">{resumingAfterError ? 'Connection failed' : 'Generation failed'}</p>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {generationErrorMessage || error.message || 'An error occurred while generating the tracker.'}
            </p>
            <Button variant="outline" onClick={onContinue} className="mt-3">
              Continue from where it left off
            </Button>
          </div>
        )}

        {showNoTracker && !error && (
          <div className="rounded-md border border-warning/50 bg-warning/10 p-4 text-warning-foreground">
            <p className="font-semibold">No tracker generated</p>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {generationErrorMessage || 'The AI responded but did not generate a valid tracker configuration.'}
            </p>
            <Button variant="outline" onClick={onContinue} className="mt-3">
              Continue from where it left off
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
