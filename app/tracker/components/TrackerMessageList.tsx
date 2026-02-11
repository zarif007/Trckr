'use client'

import { motion } from 'framer-motion'
import { Sparkles, User, Loader2, Maximize2, Target, ChevronDown, ChevronUp } from 'lucide-react'
import type { Message } from '../hooks/useTrackerChat'
import type { TrackerResponse } from '../hooks/useTrackerChat'

interface TrackerMessageListProps {
  messages: Message[]
  isLoading: boolean
  /** Streamed object from useObject – typed loosely to accept PartialObject from AI SDK */
  object: unknown
  setActiveTrackerData: (data: TrackerResponse) => void
  setIsDialogOpen: (open: boolean) => void
  setMessageThinkingOpen: (idx: number, open: boolean) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

function renderTrackerPreview(
  trackerData: TrackerResponse,
  onPreviewClick: () => void
) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onPreviewClick}
      className="group relative max-w-sm p-5 rounded-md border border-border/50 bg-secondary/30 backdrop-blur-xl hover:border-primary/50 transition-all cursor-pointer shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Tracker Ready</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{trackerData.tabs?.[0]?.id || 'Custom Tracker'}</p>
          </div>
        </div>
        <div className="p-2 rounded-md group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  )
}

function renderStreamingPreview() {
  return (
    <div
      className="relative w-full p-5 rounded-md border border-primary/20 bg-primary/5 animate-pulse backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-primary/20 text-primary border border-primary/30">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Architecting Tracker...</p>
            <p className="text-xs text-muted-foreground font-medium italic">Streaming real-time components</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrackerMessageList({
  messages,
  isLoading,
  object: streamedObject,
  setActiveTrackerData,
  setIsDialogOpen,
  setMessageThinkingOpen,
  messagesEndRef,
}: TrackerMessageListProps) {
  const object = streamedObject as {
    manager?: { thinking?: string; prd?: { name?: string; description?: string }; builderTodo?: Array<{ action?: string; target?: string; task?: string }> }
    tracker?: TrackerResponse
    trackerPatch?: Record<string, unknown>
  } | undefined
  return (
    <motion.div
      key="chat-messages"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 md:space-y-8 pt-8 md:pt-12"
    >
      {messages.map((message, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0 shadow-md mt-0">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
          )}
          <div
            className={`space-y-2 ${message.role === 'user' ? 'items-end max-w-[85%]' : 'items-start flex-1'
              } flex flex-col`}
          >
            {message.content && (
              <div
                className={`rounded-md px-4 py-2.5 shadow-sm font-medium ${message.role === 'user'
                  ? 'bg-primary text-primary-foreground text-sm leading-relaxed'
                  : 'bg-secondary/30 backdrop-blur-xl border border-border/50 text-foreground text-sm leading-relaxed'
                  }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
            {message.managerData && (
              <div className="w-full min-w-0 space-y-4">
                <div className="flex flex-col gap-2 p-4 rounded-md bg-secondary/20 border border-border/40 backdrop-blur-sm min-w-0">
                  <button
                    onClick={() => {
                      setMessageThinkingOpen(idx, !message.isThinkingOpen)
                    }}
                    className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3" />
                      Manager Insights
                    </div>
                    {message.isThinkingOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {message.isThinkingOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-3 min-w-0">
                        <p className="text-sm font-medium leading-relaxed italic text-foreground/80 break-words">
                          "{message.managerData.thinking}"
                        </p>
                        {message.managerData.prd && (
                          <div className="mt-2 pt-2 border-t border-border/20 min-w-0">
                            <p className="text-xs text-muted-foreground break-words">{message.managerData.prd.description}</p>
                          </div>
                        )}
                        {message.managerData.builderTodo && message.managerData.builderTodo.length > 0 && (
                          <div className="mt-3 space-y-2 min-w-0">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Execution Plan</p>
                            <div className="flex flex-col gap-1.5">
                              {message.managerData.builderTodo.map((todo, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs font-medium text-foreground/90 bg-background/40 p-2 rounded border border-border/20 min-w-0">
                                  <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${todo.action === 'create' ? 'bg-green-500' :
                                    todo.action === 'update' ? 'bg-blue-500' :
                                      todo.action === 'delete' ? 'bg-red-500' : 'bg-muted-foreground'
                                    }`} />
                                  <div className="min-w-0 break-words">
                                    <span className="opacity-60">{todo.action} </span>
                                    <span className="font-bold">{todo.target}</span>
                                    <span className="opacity-80">: {todo.task}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
            {message.trackerData && (
              <div className="w-full">
                {renderTrackerPreview(message.trackerData, () => {
                  setActiveTrackerData(message.trackerData!)
                  setIsDialogOpen(true)
                })}
              </div>
            )}
          </div>
          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-md bg-secondary/50 border border-border/50 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </motion.div>
      ))}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0 shadow-md mt-1">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 rounded-md px-4 py-2.5 bg-secondary/30 backdrop-blur-xl border border-border/50 text-foreground font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <p className="text-sm">
                  {!object?.manager ? 'Consulting Product Manager...' :
                    !(object?.tracker || object?.trackerPatch) ? 'Architecting structure...' :
                      'Constructing your tracker...'}
                </p>
              </div>

              {object?.manager && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-md bg-secondary/10 border border-border/30 backdrop-blur-md space-y-3 min-w-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] flex flex-row space-x-2 items-center justify-center font-black text-primary uppercase tracking-[0.2em]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      <p>Strategy Phase</p>
                    </div>
                  </div>

                  {object.manager.thinking && (
                    <p className="text-sm text-foreground/70 font-medium leading-relaxed border-l-2 border-primary/30 pl-4 py-1 break-words min-w-0">
                      {object.manager.thinking}
                    </p>
                  )}

                  {object.manager.prd && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 min-w-0"
                    >
                      <div className="p-3 rounded-md bg-background/50 border border-border/30 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Summary</p>
                        <p className="text-xs font-medium break-words min-w-0">{object.manager.prd.description || "Analyzing..."}</p>
                      </div>
                    </motion.div>
                  )}

                  {object.manager.builderTodo && object.manager.builderTodo.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2 pt-2 min-w-0"
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground">Action Items</p>
                      <div className="flex flex-col gap-2">
                        {object.manager.builderTodo.map((todo, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs font-bold text-foreground bg-background/50 p-2.5 rounded-md border border-border/20 shadow-sm min-w-0">
                            {todo?.action === 'create' && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />}
                            {todo?.action === 'update' && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
                            {todo?.action === 'delete' && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
                            {!todo?.action && <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                            <span className="flex-1 min-w-0 break-words">{todo?.task || "Preparing task..."}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
          {isLoading && object?.tracker && renderStreamingPreview()}
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </motion.div>
  )
}
