'use client'

import { AnimatePresence } from 'framer-motion'
import { TrackerEmptyState } from '@/app/components/tracker-page/TrackerEmptyState'
import { TrackerInputArea } from '@/app/components/tracker-page/TrackerInputArea'
import { TrackerMessageList } from '@/app/components/tracker-page/TrackerMessageList'
import type { Message, TrackerResponse, ToolCallEntry } from '../hooks/useTrackerChat'
import { TrackerStatusPanel, type TrackerStatusPanelProps } from './TrackerStatusPanel'

interface TrackerChatPanelProps {
  showStatusPanel: boolean
  statusPanelProps: TrackerStatusPanelProps
  input: string
  setInput: (v: string) => void
  isFocused: boolean
  setIsFocused: (v: boolean) => void
  handleSubmit: () => void
  applySuggestion: (suggestion: string) => void
  isLoading: boolean
  isChatEmpty: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  messages: Message[]
  setMessageThinkingOpen: (idx: number, open: boolean) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  object: unknown
  onViewTracker?: (trackerData: TrackerResponse, messageIndex: number) => void
  activeTrackerMessageIndex?: number | null
  toolCalls?: ToolCallEntry[]
  isResolvingExpressions?: boolean
}

export function TrackerChatPanel({
  showStatusPanel,
  statusPanelProps,
  input,
  setInput,
  isFocused,
  setIsFocused,
  handleSubmit,
  applySuggestion,
  isLoading,
  isChatEmpty,
  textareaRef,
  messages,
  setMessageThinkingOpen,
  messagesEndRef,
  object,
  onViewTracker,
  activeTrackerMessageIndex,
  toolCalls,
  isResolvingExpressions,
}: TrackerChatPanelProps) {
  return (
    <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/30 border-l border-border/60">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {showStatusPanel && <TrackerStatusPanel {...statusPanelProps} />}

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
                onViewTracker={onViewTracker}
                activeTrackerMessageIndex={activeTrackerMessageIndex}
                toolCalls={toolCalls}
                isResolvingExpressions={isResolvingExpressions}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isChatEmpty && (
        <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto max-w-2xl">
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
    </section>
  )
}
