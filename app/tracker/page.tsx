'use client'

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AlertTriangle, Bot, Database, Layout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TrackerEmptyState } from '@/app/components/tracker-page/TrackerEmptyState'
import { TrackerMessageList } from '@/app/components/tracker-page/TrackerMessageList'
import { TrackerInputArea } from '@/app/components/tracker-page/TrackerInputArea'
import { TrackerDisplay } from '@/app/components/tracker-display'
import { useUndoableSchemaChange } from '@/app/components/tracker-display/edit-mode'
import { EditModeUndoButton, useUndoKeyboardShortcut } from '@/app/components/tracker-display/edit-mode/undo'
import {
  INITIAL_TRACKER_SCHEMA,
} from '@/app/components/tracker-display/tracker-editor'
import { useTrackerChat, type TrackerResponse } from './hooks/useTrackerChat'

const MIN_LEFT_PX = 320
const MIN_RIGHT_PX = 360
const DEFAULT_LEFT_RATIO = 0.75

const TrackerPanel = memo(function TrackerPanel({
  schema,
  editMode,
  setEditMode,
  isChatOpen,
  setIsChatOpen,
  isStreamingTracker,
  streamedTracker,
  trackerDataRef,
  handleSchemaChange,
  undo,
  canUndo,
  leftWidth,
}: {
  schema: TrackerResponse
  editMode: boolean
  setEditMode: (v: boolean) => void
  isChatOpen: boolean
  setIsChatOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  isStreamingTracker: boolean
  streamedTracker: TrackerResponse | undefined
  trackerDataRef: React.RefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
  handleSchemaChange?: (next: TrackerResponse) => void
  undo?: () => void
  canUndo?: boolean
  leftWidth: number | null
}) {
  const [debugView, setDebugView] = useState<'structure' | 'data' | null>(null)
  const [dataSnapshot, setDataSnapshot] = useState<Record<string, Array<Record<string, unknown>>> | null>(null)

  useUndoKeyboardShortcut(editMode, canUndo ?? false, undo)

  const handleShowStructure = useCallback(() => {
    setDataSnapshot(null)
    setDebugView('structure')
  }, [])
  const handleShowData = useCallback(() => {
    const data = trackerDataRef.current?.() ?? {}
    setDataSnapshot(data)
    setDebugView('data')
  }, [trackerDataRef])

  const debugJson =
    debugView === 'structure'
      ? JSON.stringify(schema, null, 2)
      : debugView === 'data' && dataSnapshot !== null
        ? JSON.stringify(dataSnapshot, null, 2)
        : ''

  return (
    <section
      className="relative h-full bg-background/60 rounded-lg transition-shadow duration-300"
      style={{ width: isChatOpen ? (leftWidth ? `${leftWidth}px` : `${DEFAULT_LEFT_RATIO * 100}%`) : '100%' }}
    >
      {isStreamingTracker && (
        <div className="absolute top-0 left-0 right-0 z-30 h-1 overflow-hidden rounded-t-lg bg-muted/40">
          <div className="h-full w-1/3 min-w-[120px] rounded-full bg-primary animate-progress-bar" />
        </div>
      )}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-md border border-border/60 bg-background/90 p-1.5 shadow-sm">
        <div className={`inline-flex items-center rounded-md border border-border/60 bg-background/80 p-0.5 ${isStreamingTracker ? 'opacity-60 pointer-events-none' : ''}`}>
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
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsChatOpen((prev) => !prev)}
          aria-label={isChatOpen ? 'Hide agent chat' : 'Show agent chat'}
        >
          <Bot className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleShowStructure}
          aria-label="Show tracker structure (debug)"
        >
          <Layout className="h-3.5 w-3.5" />
          Structure
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleShowData}
          aria-label="Show tracker data (debug)"
        >
          <Database className="h-3.5 w-3.5" />
          Data
        </Button>
        <EditModeUndoButton
          undo={undo}
          canUndo={canUndo ?? false}
          visible={editMode}
        />
      </div>

      <Dialog open={debugView !== null} onOpenChange={(open) => !open && setDebugView(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {debugView === 'structure' ? 'Tracker structure' : 'Tracker data'}
            </DialogTitle>
          </DialogHeader>
          <pre className="flex-1 min-h-0 overflow-auto rounded-md bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap break-words border border-border/60">
            {debugJson || '{}'}
          </pre>
        </DialogContent>
      </Dialog>

      <div className="h-full overflow-y-auto px-4 py-6">
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
            undo={undo}
            canUndo={canUndo}
          />
        )}
      </div>
    </section>
  )
})

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
    streamedDisplayTracker,
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
  const [isChatOpen, setIsChatOpen] = useState(true)
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

  const undoable = useUndoableSchemaChange(schema, handleSchemaChange)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isChatOpen) return

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
  }, [isChatOpen])

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

  const isStreamingTracker = Boolean(isLoading && streamedDisplayTracker)

  const showStatusPanel =
    Boolean(error) ||
    Boolean(generationErrorMessage) ||
    validationErrors.length > 0 ||
    (!isLoading && messages.length > 0 && !hasGeneratedTracker)

  // Switch to preview as soon as the agent starts (streaming begins)
  useEffect(() => {
    if (isLoading) {
      setEditMode(false)
    }
  }, [isLoading])

  return (
    <div className="h-screen box-border font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden flex flex-col pt-20 md:pt-20">
      <div ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
        <TrackerPanel
          schema={schema}
          editMode={editMode}
          setEditMode={setEditMode}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isStreamingTracker={isStreamingTracker}
          streamedTracker={streamedDisplayTracker ?? undefined}
          trackerDataRef={trackerDataRef}
          handleSchemaChange={editMode ? undoable.onSchemaChange : undefined}
          undo={editMode ? undoable.undo : undefined}
          canUndo={editMode ? undoable.canUndo : false}
          leftWidth={leftWidth}
        />

        {isChatOpen && (
          <>
            <div
              className="w-2 shrink-0 cursor-col-resize bg-border/40 hover:bg-border/70 transition-colors"
              onPointerDown={handlePointerDown}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panels"
            />

            <section className="flex-1 min-w-[360px] flex flex-col overflow-hidden bg-background">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6">
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
          </>
        )}
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
