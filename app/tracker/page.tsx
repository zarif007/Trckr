'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TrackerDisplay } from '@/app/components/TrackerDisplay'

type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'boolean'
  | 'text'

interface TrackerTab {
  name: string
  fieldName: string
}

interface TrackerSection {
  name: string
  fieldName: string
  tabId: string
}

interface TrackerGrid {
  name: string
  fieldName: string
  type: 'table' | 'kanban'
  sectionId: string
}

interface TrackerField {
  name: string
  fieldName: string
  type: TrackerFieldType
  gridId: string
  options?: string[]
}

interface TrackerResponse {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  views: string[]
  examples: Array<Record<string, any>>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  trackerData?: TrackerResponse
}

export default function TrackerPage() {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const INPUT_ID = 'tracker-input'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    const currentMessages = messages
    setInput('')

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    }

    setIsLoading(true)

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setMessages((prev) => [...prev, newUserMessage])
        resolve()
      })
    })

    try {
      const response = await fetch('/api/generate-tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage,
          messages: currentMessages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate tracker')
      }

      const trackerData: TrackerResponse = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: "Here's your tracker configuration:",
        trackerData,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred'

      const errorMessageObj: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      }
      setMessages((prev) => [...prev, errorMessageObj])
      console.error('Error generating tracker:', err)
    } finally {
      setIsLoading(false)
    }
  }

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

  const renderTrackerCard = (trackerData: TrackerResponse) => {
    return (
      <TrackerDisplay
        tabs={trackerData.tabs}
        sections={trackerData.sections}
        grids={trackerData.grids}
        fields={trackerData.fields}
        examples={trackerData.examples}
        views={trackerData.views}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-64">
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg bg-primary">
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
                    className={`max-w-[80%] space-y-2 ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    } flex flex-col`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    {message.trackerData &&
                      renderTrackerCard(message.trackerData)}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="max-w-[80%] space-y-2 flex flex-col items-start">
                    <div className="rounded-2xl px-4 py-3 bg-muted text-foreground">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <p className="text-sm">Generating tracker...</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-3xl px-6 py-6 bg-background/80 backdrop-blur-sm">
        <div
          className={`relative rounded-2xl transition-all duration-200 ${
            isFocused ? 'shadow-2xl' : 'shadow-xl'
          }`}
        >
          <div className="flex items-end gap-3 p-4 rounded-2xl border border-border bg-background transition-all">
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
              className="rounded-lg h-12 w-12 shrink-0 transition-all hover:bg-primary/90 disabled:opacity-50"
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
    </div>
  )
}
