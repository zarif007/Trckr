'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, User, Loader2, Target, ChevronDown, ChevronUp, Eye, Wrench, Box, PackagePlus } from 'lucide-react'
import Markdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import type { Message, TrackerResponse, ToolCallEntry } from '@/app/tracker/hooks/useTrackerChat'
import { masterDataAuditHasCreated } from '@/lib/master-data/chat-audit'
import {
  MasterDataCreatedTrackersPanel,
  MasterDataFunctionCallsPanel,
} from './master-data-chat-audit'
import { ToolCallProgress } from './ToolCallProgress'

interface TrackerMessageListProps {
  messages: Message[]
  isLoading: boolean
  /** Streamed object from useObject – typed loosely to accept PartialObject from AI SDK */
  object: unknown
  setMessageThinkingOpen: (idx: number, open: boolean) => void
  setMessageToolsOpen: (idx: number, open: boolean) => void
  setMessageMasterDataFunctionsOpen?: (idx: number, open: boolean) => void
  setMessageMasterDataCreatedOpen?: (idx: number, open: boolean) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  /** Callback when user wants to view a specific message's tracker version */
  onViewTracker?: (trackerData: TrackerResponse, messageIndex: number) => void
  /** Index of the message whose tracker is currently being viewed (for highlighting) */
  activeTrackerMessageIndex?: number | null
  toolCalls?: ToolCallEntry[]
  isResolvingExpressions?: boolean
  isResolvingMasterData?: boolean
  mode?: 'schema' | 'data'
}

function renderStreamingStatus(message: string) {
  return (
    <div className="w-full min-w-0 rounded-md border border-border/40 bg-muted/40 px-4 py-3 flex items-center gap-3">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}

export function TrackerMessageList({
  messages,
  isLoading,
  object: streamedObject,
  setMessageThinkingOpen,
  setMessageToolsOpen,
  setMessageMasterDataFunctionsOpen: setMdFunctionsOpen = () => {},
  setMessageMasterDataCreatedOpen: setMdCreatedOpen = () => {},
  messagesEndRef,
  onViewTracker,
  activeTrackerMessageIndex,
  toolCalls = [],
  isResolvingExpressions = false,
  isResolvingMasterData = false,
  mode = 'schema',
}: TrackerMessageListProps) {
  const [previewToolsOpen, setPreviewToolsOpen] = useState(false)
  useEffect(() => {
    if (isResolvingExpressions && toolCalls.length > 0) {
      setPreviewToolsOpen(true)
    }
  }, [isResolvingExpressions, toolCalls.length])

  const isAnalystMode = mode === 'data'
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
      transition={{ duration: 0.2 }}
      className="space-y-6 pt-4"
    >
      {messages.map((message, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
          )}
          <div
            className={`space-y-2 ${message.role === 'user' ? 'items-end max-w-[88%]' : 'items-start flex-1 min-w-0 w-full'} flex flex-col`}
          >
            {message.content && (
              <div
                className={`rounded-md px-4 py-2.5 text-sm leading-relaxed ${message.role === 'user'
                  ? 'bg-foreground text-background font-medium'
                  : 'bg-muted/60 border border-border/40 text-foreground'
                  }`}
              >
                {isAnalystMode && message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:my-2 prose-pre:my-2">
                    <Markdown>{message.content}</Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            )}
            {message.role === 'assistant' &&
              (message.managerData ||
                (message.toolCalls && message.toolCalls.length > 0) ||
                message.masterDataBuildResult) && (
                <div className="w-full min-w-0 space-y-2">
                  {message.managerData && (
                    <div className="w-full min-w-0">
                      <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/40 border border-border/30 min-w-0 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setMessageThinkingOpen(idx, !message.isThinkingOpen)
                          }}
                          className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            Manager insights
                          </div>
                          {message.isThinkingOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {message.isThinkingOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden w-full min-w-0"
                          >
                            <div className="pt-2 space-y-3 min-w-0 w-full">
                              <p className="text-sm font-medium leading-relaxed italic text-foreground/80 break-words">
                                &ldquo;{message.managerData.thinking}&rdquo;
                              </p>
                              {message.managerData.builderTodo && message.managerData.builderTodo.length > 0 && (
                                <div className="mt-2 space-y-1.5 min-w-0 w-full">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Execution plan</p>
                                  <div className="flex flex-col gap-1 w-full min-w-0">
                                    {message.managerData.builderTodo.map((todo, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs font-medium text-foreground/90 bg-background/40 p-2 rounded-md border border-border/20 min-w-0 w-full">
                                        <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${todo.action === 'create' ? 'bg-success' :
                                          todo.action === 'update' ? 'bg-info' :
                                            todo.action === 'delete' ? 'bg-destructive' : 'bg-muted-foreground'
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
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="w-full min-w-0">
                      <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/40 border border-border/30 min-w-0 w-full">
                        <button
                          type="button"
                          onClick={() => setMessageToolsOpen(idx, !message.isToolsOpen)}
                          className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Wrench className="w-3 h-3" />
                            Tools
                          </div>
                          {message.isToolsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {message.isToolsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden w-full min-w-0"
                          >
                            <ToolCallProgress
                              toolCalls={message.toolCalls}
                              className="border-0 bg-transparent shadow-none p-0 pt-2 rounded-none"
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                  {message.masterDataBuildResult && (
                    <>
                      <div className="w-full min-w-0">
                        <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/40 border border-border/30 min-w-0 w-full">
                          <button
                            type="button"
                            onClick={() =>
                              setMdFunctionsOpen(idx, !message.isMasterDataFunctionsOpen)
                            }
                            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Box className="w-3 h-3" />
                              Functions
                            </div>
                            {message.isMasterDataFunctionsOpen ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                          {message.isMasterDataFunctionsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden w-full min-w-0"
                            >
                              <MasterDataFunctionCallsPanel
                                audit={message.masterDataBuildResult}
                                className="border-0 bg-transparent shadow-none p-0 pt-2 rounded-none"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      {masterDataAuditHasCreated(message.masterDataBuildResult) && (
                        <div className="w-full min-w-0">
                          <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/40 border border-border/30 min-w-0 w-full">
                            <button
                              type="button"
                              onClick={() =>
                                setMdCreatedOpen(idx, !message.isMasterDataCreatedOpen)
                              }
                              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <PackagePlus className="w-3 h-3" />
                                Created
                              </div>
                              {message.isMasterDataCreatedOpen ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {message.isMasterDataCreatedOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden w-full min-w-0"
                              >
                                <MasterDataCreatedTrackersPanel
                                  audit={message.masterDataBuildResult}
                                  className="border-0 bg-transparent shadow-none p-0 pt-2 rounded-none"
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            {message.trackerData && (
              <div
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  activeTrackerMessageIndex === idx
                    ? 'border-foreground/20 bg-muted/50 text-foreground'
                    : 'border-border/40 bg-muted/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {activeTrackerMessageIndex === idx ? 'Viewing this version' : 'Tracker updated'}
                  </span>
                  {onViewTracker && activeTrackerMessageIndex !== idx && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs font-medium hover:bg-foreground/10 hover:text-foreground"
                      onClick={() => onViewTracker(message.trackerData!, idx)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-md bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </motion.div>
      ))}
      {(isLoading || isResolvingExpressions || isResolvingMasterData) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div className="flex-1 min-w-0 w-full space-y-3">
              <div className="flex items-center gap-2.5 rounded-md px-4 py-2.5 bg-muted/60 border border-border/40 text-foreground text-sm font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground/70" />
                <p className="text-sm">
                  {isAnalystMode
                    ? (object as { content?: string } | undefined)?.content
                      ? 'Writing analysis…'
                      : 'Analyzing your data…'
                    : isResolvingMasterData
                      ? 'Linking master data…'
                      : isResolvingExpressions
                        ? 'Generating expressions…'
                        : !object?.manager ? 'Consulting product manager…' :
                          !(object?.tracker || object?.trackerPatch) ? 'Architecting structure…' :
                            'Building your tracker…'}
                </p>
              </div>

              {isAnalystMode && isLoading && (object as { content?: string } | undefined)?.content && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-md px-4 py-2.5 bg-muted/60 border border-border/40 text-foreground"
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:my-2 prose-pre:my-2">
                    <Markdown>{(object as { content?: string }).content}</Markdown>
                  </div>
                </motion.div>
              )}

              {!isAnalystMode &&
                (((isLoading || isResolvingMasterData) && object?.manager) ||
                  toolCalls.length > 0) && (
                  <div className="w-full min-w-0 space-y-2">
                    {(isLoading || isResolvingMasterData) && object?.manager && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-md bg-muted/30 border border-border/30 space-y-3 min-w-0 w-full"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/40" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-foreground/60" />
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Strategy</span>
                        </div>

                        {object.manager.thinking && (
                          <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-border/50 pl-3 py-0.5 break-words min-w-0">
                            {object.manager.thinking}
                          </p>
                        )}

                        {object.manager.builderTodo && object.manager.builderTodo.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2 pt-1 min-w-0 w-full"
                          >
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
                            <div className="flex flex-col gap-1.5 w-full min-w-0">
                              {object.manager.builderTodo.map((todo, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs font-medium text-foreground bg-background/40 p-2 rounded-md border border-border/20 min-w-0 w-full">
                                  {todo?.action === 'create' && <div className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />}
                                  {todo?.action === 'update' && <div className="h-2 w-2 rounded-full bg-info animate-pulse shrink-0" />}
                                  {todo?.action === 'delete' && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />}
                                  {!todo?.action && <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />}
                                  <span className="flex-1 min-w-0 break-words">{todo?.task || "Preparing task..."}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    {toolCalls.length > 0 && (
                      <div className="w-full min-w-0">
                        <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/40 border border-border/30 min-w-0 w-full">
                          <button
                            type="button"
                            onClick={() => setPreviewToolsOpen((o) => !o)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Wrench className="w-3 h-3" />
                              Tools
                            </div>
                            {previewToolsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {previewToolsOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden w-full min-w-0"
                            >
                              <ToolCallProgress
                                toolCalls={toolCalls}
                                className="border-0 bg-transparent shadow-none p-0 pt-2 rounded-none"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          {!isAnalystMode &&
            isLoading &&
            (object?.tracker || object?.trackerPatch) &&
            renderStreamingStatus('Streaming tracker…')}
          {!isAnalystMode && isResolvingMasterData && renderStreamingStatus('Linking master data…')}
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </motion.div>
  )
}
