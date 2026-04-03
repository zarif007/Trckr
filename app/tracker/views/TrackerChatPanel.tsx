'use client'

import { useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TrackerEmptyState } from '@/app/components/tracker-page/TrackerEmptyState'
import { TrackerInputArea } from '@/app/components/tracker-page/TrackerInputArea'
import { TrackerMessageList } from '@/app/components/tracker-page/TrackerMessageList'
import { cn } from '@/lib/utils'
import type { Message, TrackerResponse, ToolCallEntry } from '../hooks/useTrackerChat'
import { TrackerStatusPanel, type TrackerStatusPanelProps } from './TrackerStatusPanel'

interface ConversationWindow {
  id: string
  title: string
}

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
  setMessageToolsOpen: (idx: number, open: boolean) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  object: unknown
  onViewTracker?: (trackerData: TrackerResponse, messageIndex: number) => void
  activeTrackerMessageIndex?: number | null
  toolCalls?: ToolCallEntry[]
  statusMessage?: string
  mode?: 'schema' | 'data'
  isConversationLoading?: boolean
  /** Optional multi-conversation controls (Cursor-style chat tabs). */
  conversationWindows?: ConversationWindow[]
  activeConversationId?: string
  onSelectConversation?: (id: string) => void
  onCreateConversation?: () => void
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
  setMessageToolsOpen,
  messagesEndRef,
  object,
  onViewTracker,
  activeTrackerMessageIndex,
  toolCalls,
  statusMessage,
  mode = 'schema',
  isConversationLoading = false,
  conversationWindows,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
}: TrackerChatPanelProps) {
  const tabStripRef = useRef<HTMLDivElement>(null)

  const handleTabStripWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabStripRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return
    e.preventDefault()
    el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + e.deltaY))
  }

  return (
    <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden border-l border-border/30 bg-muted/10 dark:bg-transparent">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-5">
          {conversationWindows && conversationWindows.length > 0 && (
            <div className="flex items-center gap-0 border-b border-border/40 mb-3 min-h-8">
              <div
                ref={tabStripRef}
                className="flex items-center gap-0 overflow-x-auto scrollbar-none flex-1 min-w-0 flex-nowrap"
                onWheel={handleTabStripWheel}
              >
                {conversationWindows.map((window) => {
                  const isActive =
                    (activeConversationId ?? conversationWindows[0]?.id) === window.id
                  const tabLabel =
                    window.title.length > 12
                      ? `${window.title.slice(0, 12).trim()}…`
                      : window.title
                  return (
                    <button
                      key={window.id}
                      type="button"
                      onClick={() => onSelectConversation?.(window.id)}
                      className={cn(
                        'px-3 py-1.5 text-xs transition-colors duration-150 whitespace-nowrap border border-b-0 border-transparent rounded-t-md -mb-px shrink-0',
                        isActive
                          ? 'bg-background/60 text-foreground border-border/60 border-b-muted/20 dark:bg-muted/10'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent dark:bg-muted/20',
                      )}
                      title={window.title}
                    >
                      {tabLabel}
                    </button>
                  )
                })}
              </div>

              {onCreateConversation && (
                <button
                  type="button"
                  onClick={onCreateConversation}
                  className="inline-flex items-center justify-center rounded-t-md w-8 h-8 border border-border/50 border-b-0 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground shrink-0"
                  aria-label="New conversation"
                >
                  +
                </button>
              )}
            </div>
          )}

          {showStatusPanel && <TrackerStatusPanel {...statusPanelProps} />}

          {isConversationLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xs text-muted-foreground">Loading conversation…</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {isChatEmpty ? (
                <TrackerEmptyState
                  key="empty-state"
                  onApplySuggestion={applySuggestion}
                  mode={mode}
                />
              ) : (
                <TrackerMessageList
                  key="chat-messages"
                  messages={messages}
                  isLoading={isLoading}
                  object={object}
                  setMessageThinkingOpen={setMessageThinkingOpen}
                  setMessageToolsOpen={setMessageToolsOpen}
                  messagesEndRef={messagesEndRef}
                  onViewTracker={onViewTracker}
                  activeTrackerMessageIndex={activeTrackerMessageIndex}
                  toolCalls={toolCalls}
                  statusMessage={statusMessage}
                  mode={mode}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3">
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
            variant={isChatEmpty ? 'hero' : 'default'}
            mode={mode}
          />
        </div>
      </div>
    </section>
  )
}
