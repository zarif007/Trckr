'use client'

import { AnimatePresence } from 'framer-motion'
import { useTrackerChat } from './hooks/useTrackerChat'
import { TrackerEmptyState } from '@/app/components/tracker-page/TrackerEmptyState'
import { TrackerMessageList } from '@/app/components/tracker-page/TrackerMessageList'
import { TrackerInputArea } from '@/app/components/tracker-page/TrackerInputArea'
import { TrackerDialog } from '@/app/components/tracker-page/TrackerDialog'

export default function TrackerPage() {
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
    <div className="min-h-screen font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden flex flex-col pt-24 md:pt-40">
      <div className="flex-1 overflow-y-auto pb-32 z-10">
        <div className="relative max-w-4xl mx-auto px-2 md:px-6 py-0">
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
      />
    </div>
  )
}
