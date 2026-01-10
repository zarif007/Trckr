'use client'

import { useState, useEffect } from 'react'
import { Send, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface TrackerResponse {
  tabs: string[]
  fields: Array<{
    name: string
    type: 'string' | 'number' | 'date' | 'options' | 'boolean' | 'text'
    tab: string
    options?: string[]
  }>
  views: string[]
}

export default function TrackerPage() {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackerData, setTrackerData] = useState<TrackerResponse | null>(null)
  const INPUT_ID = 'tracker-input'

  const suggestions = [
    'Track my daily water intake',
    'Monitor my workout progress',
    'Log meals and calories',
    'Track sleep hours and quality',
  ]

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setTrackerData(null)
    const query = input.trim()

    try {
      const response = await fetch('/api/generate-tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate tracker')
      }

      const data: TrackerResponse = await response.json()
      setTrackerData(data)
      setInput('') // Clear input only on success
      console.log('Generated tracker:', data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error generating tracker:', err)
      // Keep input on error so user can retry
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

  return (
    <div className="min-h-screen bg-background">
      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <div className="min-h-[calc(100vh-220px)] flex items-center justify-center relative">
          {/* Subtle animated background */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(600px 300px at 10% 10%, rgba(99, 102, 241, 0.06), transparent 8%),
                  radial-gradient(400px 200px at 90% 90%, rgba(79, 70, 229, 0.05), transparent 10%)
                `,
              }}
            />
          </div>

          <div className="text-center space-y-6 max-w-md relative z-10">
            {isLoading ? (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg bg-primary">
                  <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    Generating your tracker...
                  </h3>
                  <p className="text-muted-foreground">
                    This might take a few seconds
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg bg-destructive/10">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    Something went wrong
                  </h3>
                  <p className="text-muted-foreground text-sm">{error}</p>
                </div>
              </div>
            ) : trackerData ? (
              <div className="space-y-4 text-left max-w-2xl mx-auto z-20">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg bg-primary mb-4">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
                <Card className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">
                      Generated Tracker
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2">
                          tabs ({trackerData.tabs.length}):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {trackerData.tabs.map((tab, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm"
                            >
                              {tab}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2">
                          Fields ({trackerData.fields.length}):
                        </h4>
                        <div className="space-y-2">
                          {trackerData.fields.map((field, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 rounded-lg bg-muted/50 text-sm"
                            >
                              <span className="font-medium text-foreground">
                                {field.name}
                              </span>
                              <span className="text-muted-foreground mx-2">
                                •
                              </span>
                              <span className="text-muted-foreground">
                                {field.type}
                              </span>
                              <span className="text-muted-foreground mx-2">
                                •
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {field.tab}
                              </span>
                              {field.options && field.options.length > 0 && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Options: {field.options.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-2">
                          Views ({trackerData.views.length}):
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {trackerData.views.map((view, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                            >
                              {view}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setTrackerData(null)
                        setError(null)
                        setInput('')
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Create Another Tracker
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <div>
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg bg-primary">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    Ready to get started?
                  </h3>
                  <p className="text-muted-foreground">
                    Try something like "Track my daily water intake" or "Monitor
                    my workout progress"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-3xl px-6 py-6">
        <div
          className={`relative rounded-2xl transition-all duration-200 ${
            isFocused ? 'shadow-2xl' : 'shadow-xl'
          }`}
        >
          <Card
            className={`relative rounded-2xl overflow-hidden border transition-colors border-0 ${
              isFocused ? 'border-primary' : 'border-border'
            }`}
          >
            <div className="flex items-end gap-3 p-4">
              <div className="flex-1 relative">
                <div className="mb-2 flex flex-wrap gap-2 px-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="text-xs px-3 py-1 rounded-full bg-muted/40 hover:bg-muted/60 text-muted-foreground transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>

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
                  placeholder="Describe what you want to track..."
                  rows={1}
                  className="w-full py-2 bg-transparent focus:outline-none resize-none text-base text-foreground placeholder:text-muted-foreground min-h-[48px] max-h-[200px] border-none focus:ring-0"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="icon"
                className={`rounded-xl h-[52px] w-[52px] shrink-0 transition-transform ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:scale-105'
                    : 'bg-foreground text-background disabled:bg-muted disabled:text-background disabled:opacity-50'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>

            <div className="px-4 pb-3 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>{input.length}/2000</span>
              </div>

              <div className="mt-2 h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{
                    width: `${Math.min(100, (input.length / 2000) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
