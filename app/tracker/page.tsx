'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { TrackerModeChoice } from '@/app/components/tracker-page/TrackerModeChoice'
import { useTrackerChat } from './hooks/useTrackerChat'
import { TrackerEmptyState } from '@/app/components/tracker-page/TrackerEmptyState'
import { TrackerMessageList } from '@/app/components/tracker-page/TrackerMessageList'
import { TrackerInputArea } from '@/app/components/tracker-page/TrackerInputArea'
import { TrackerDialog } from '@/app/components/tracker-page/TrackerDialog'
import { TrackerDisplay } from '@/app/components/tracker-display'
import {
  INITIAL_TRACKER_SCHEMA,
  useEditableTrackerSchema,
} from '@/app/components/tracker-display/tracker-editor'

type TrackerMode = 'choice' | 'ai' | 'manual'

function TrackerPageContent() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<TrackerMode>(() => {
    const m = searchParams.get('mode')
    return (m === 'ai' || m === 'manual') ? m : 'choice'
  })

  useEffect(() => {
    const m = searchParams.get('mode')
    if (m === 'ai' || m === 'manual') setMode(m)
  }, [searchParams])

  const pageWrapper = 'min-h-screen font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden flex flex-col pt-24 md:pt-40'

  if (mode === 'choice') {
    return (
      <div className={pageWrapper}>
        <TrackerModeChoice
          onSelectAI={() => setMode('ai')}
          onSelectManual={() => setMode('manual')}
        />
      </div>
    )
  }

  if (mode === 'manual') {
    return (
      <TrackerManualView onBackToStart={() => setMode('choice')} />
    )
  }

  return (
    <TrackerAIView onBackToStart={() => setMode('choice')} />
  )
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

function TrackerAIView({ onBackToStart }: { onBackToStart: () => void }) {
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
    isDialogOpen,
    setIsDialogOpen,
    activeTrackerData,
    setActiveTrackerData,
    generationErrorMessage,
    validationErrors,
    resumingAfterError,
    trackerDataRef,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
    clearDialogError,
  } = useTrackerChat()

  return (
    <div className="min-h-screen font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden flex flex-col pt-20 md:pt-20">
      <div className="flex-1 overflow-y-auto pb-32 z-10">
        <div className="relative max-w-4xl mx-auto px-2 md:px-6 py-0">
          <button
            type="button"
            onClick={onBackToStart}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-0 transition-colors"
          >
            ← Back to start
          </button>
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
                setActiveTrackerData={setActiveTrackerData}
                setIsDialogOpen={setIsDialogOpen}
                setMessageThinkingOpen={setMessageThinkingOpen}
                messagesEndRef={messagesEndRef}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isChatEmpty && (
        <div className="fixed left-0 right-0 bottom-0 z-30 pt-8 pb-6">
          <div className="max-w-4xl mx-auto px-4">
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
        </div>
      )}

      <TrackerDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isLoading={isLoading}
        object={object}
        activeTrackerData={activeTrackerData}
        validationErrors={validationErrors}
        error={error}
        generationErrorMessage={generationErrorMessage}
        resumingAfterError={resumingAfterError}
        onContinue={handleContinue}
        onClearError={clearDialogError}
        trackerDataRef={trackerDataRef}
        messagesLength={messages.length}
        onSchemaChange={setActiveTrackerData}
      />
    </div>
  )
}

function TrackerManualView({ onBackToStart }: { onBackToStart: () => void }) {
  const { schema, onSchemaChange } = useEditableTrackerSchema(
    INITIAL_TRACKER_SCHEMA
  )

  return (
    <div className="min-h-screen font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden flex flex-col pt-12 md:pt-20">
      <div className="flex-1 overflow-y-auto">
        <div className="py-8 px-2 max-w-7xl mx-auto">
          <button
            type="button"
            onClick={onBackToStart}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-0 transition-colors"
          >
            ← Back to start
          </button>
          <TrackerDisplay
            tabs={schema.tabs}
            sections={schema.sections}
            grids={schema.grids}
            fields={schema.fields}
            layoutNodes={schema.layoutNodes}
            bindings={schema.bindings}
            styles={schema.styles}
            dependsOn={schema.dependsOn}
            editMode
            onSchemaChange={onSchemaChange}
          />
        </div>
      </div>
    </div>
  )
}
