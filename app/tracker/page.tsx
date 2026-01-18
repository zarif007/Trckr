'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Loader2, User, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TrackerDisplay } from '@/app/components/tracker-display'
import {
  TrackerDisplayProps,
} from '@/app/components/tracker-display/types'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { trackerSchema } from '@/lib/schemas/tracker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TrackerResponse extends Omit<TrackerDisplayProps, 'views'> {
  views: string[]
}

interface Message {
  role: 'user' | 'assistant'
  content?: string
  trackerData?: TrackerResponse
  errorMessage?: string
}

export default function TrackerPage() {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTrackerData, setActiveTrackerData] = useState<TrackerResponse | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const INPUT_ID = 'tracker-input'

  const { object, submit, isLoading, error } = useObject({
    api: '/api/generate-tracker',
    schema: trackerSchema,
    onFinish: ({ object }) => {
      if (object) {
        const assistantMessage: Message = {
          role: 'assistant',
          trackerData: object as TrackerResponse,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setPendingQuery(null)
        setActiveTrackerData(object as TrackerResponse)
      }
    },
    onError: (err) => {
      const errorMessage = err.message || 'An unknown error occurred'
      const errorMessageObj: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      }
      setMessages((prev) => [...prev, errorMessageObj])
      setPendingQuery(null)
      console.error('Error generating tracker:', err)
    },
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, object])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setPendingQuery(userMessage)

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    }

    setMessages((prev) => [...prev, newUserMessage])

    // Submit to the streaming API
    submit({
      query: userMessage,
      messages: messages,
    })
  }

  useEffect(() => {
    if (isLoading) {
      setIsDialogOpen(true)
      setActiveTrackerData(null) // Reset active tracker data when starting new generation
    }
  }, [isLoading])

  useEffect(() => {
    const el = document.getElementById(INPUT_ID) as HTMLTextAreaElement | null
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(el.scrollHeight, 200 * 1)
    el.style.height = `${next}px`
  }, [input])

  const applySuggestion = (s: string) => {
    setInput(s)
    const el = document.getElementById(INPUT_ID) as HTMLTextAreaElement | null
    el?.focus()
  }

  const renderTrackerPreview = (trackerData: TrackerResponse) => {
    return (
      <div 
        onClick={() => {
          setActiveTrackerData(trackerData)
          setIsDialogOpen(true)
        }}
        className="group relative max-w-sm p-4 rounded-md border border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Tracker Generated</p>
              <p className="text-xs text-muted-foreground">{trackerData.tabs?.[0]?.fieldName || 'Custom Tracker'}</p>
            </div>
          </div>
          <div className="p-2 rounded-md group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </div>
    )
  }

  const renderStreamingPreview = () => {
    return (
      <div 
        className="relative w-full p-4 rounded-md border border-primary/20 bg-primary/5 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/20 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Building Tracker...</p>
              <p className="text-xs text-muted-foreground italic">Updating live in preview dialog</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-64">
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-20 h-20 mx-auto rounded-md flex items-center justify-center bg-primary">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    Ready to get started?
                  </h3>
                  <p className="text-muted-foreground">
                    Describe what you want to track and I'll create a custom
                    tracker for you. You can ask for changes or refinements!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`space-y-2 ${
                      message.role === 'user' ? 'items-end max-w-[80%]' : 'items-start flex-1'
                    } flex flex-col`}
                  >
                    {message.content && (
                      <div
                        className={`rounded-md px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-50 dark:bg-black text-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    )}
                    {message.trackerData && (
                      <div className="w-full">
                        {renderTrackerPreview(message.trackerData)}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-black flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="space-y-4 animate-in fade-in-0 duration-300">
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-2 rounded-md px-4 py-3 bg-gray-50 dark:bg-black text-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <p className="text-sm">
                        {object ? 'Building your tracker...' : 'Thinking...'}
                      </p>
                    </div>
                  </div>
                  {isLoading && renderStreamingPreview()}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-3xl px-6 py-6 bg-background/80 backdrop-blur-sm">
        <div
          className={`relative rounded-md transition-all duration-200`}
        >
          <div className="flex items-end gap-3 p-4 rounded-md border border-border bg-background transition-all">
            <div className="flex-1 relative">
              <Textarea
                id={INPUT_ID}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                  if (e.key === 'Escape') {
                    setIsFocused(false)
                    const el = document.getElementById(
                      INPUT_ID
                    ) as HTMLTextAreaElement | null
                    el?.blur()
                  }
                }}
                placeholder={
                  messages.length === 0
                    ? 'Describe what you want to track...'
                    : 'Ask for changes or refinements...'
                }
                rows={1}
                className="w-full py-3 bg-transparent focus:outline-none resize-none text-base text-foreground placeholder:text-muted-foreground border-none shadow-none focus:ring-0 min-h-6 max-h-50"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-md h-12 w-12 shrink-0 transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-4xl w-full h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Tracker Preview
              {isLoading && (
                <span className="flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            {(isLoading && object) ? (
               <TrackerDisplay
                  tabs={(object.tabs || []).filter((t: unknown): t is any => !!(t && typeof t === 'object' && (t as any).fieldName))}
                  sections={(object.sections || []).filter((s: unknown): s is any => !!(s && typeof s === 'object' && (s as any).fieldName))}
                  grids={(object.grids || []).filter((g: unknown): g is any => !!(g && typeof g === 'object' && (g as any).fieldName))}
                  fields={(object.fields || []).filter((f: unknown): f is any => !!(f && typeof f === 'object' && (f as any).fieldName))}
                  examples={(object.examples || []).filter((e: unknown): e is any => !!(e && typeof e === 'object'))}
                  views={(object.views || []).filter((v: unknown): v is string => typeof v === 'string')}
               />
            ) : activeTrackerData ? (
              <TrackerDisplay
                tabs={activeTrackerData.tabs}
                sections={activeTrackerData.sections}
                grids={activeTrackerData.grids}
                fields={activeTrackerData.fields}
                examples={activeTrackerData.examples}
                views={activeTrackerData.views}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>Initializing tracker preview...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

