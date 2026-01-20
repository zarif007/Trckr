'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Loader2, User, Maximize2, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence, useSpring } from 'framer-motion'
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
import Background from '@/app/components/landing-page/Background'

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

  const springConfig = { damping: 25, stiffness: 150 }
  const mouseXSpring = useSpring(0, springConfig)
  const mouseYSpring = useSpring(0, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseXSpring.set(e.clientX)
      mouseYSpring.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseXSpring, mouseYSpring])

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

    submit({
      query: userMessage,
      messages: messages,
    })
  }

  useEffect(() => {
    if (isLoading) {
      setIsDialogOpen(true)
      setActiveTrackerData(null)
    }
  }, [isLoading])

  useEffect(() => {
    const el = document.getElementById(INPUT_ID) as HTMLTextAreaElement | null
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(el.scrollHeight, 200)
    el.style.height = `${next}px`
  }, [input])

  const applySuggestion = (s: string) => {
    setInput(s)
    const el = document.getElementById(INPUT_ID) as HTMLTextAreaElement | null
    el?.focus()
  }

  const renderTrackerPreview = (trackerData: TrackerResponse) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          setActiveTrackerData(trackerData)
          setIsDialogOpen(true)
        }}
        className="group relative max-w-sm p-5 rounded-xl border border-border/50 bg-secondary/30 backdrop-blur-xl hover:border-primary/50 transition-all cursor-pointer shadow-lg hover:shadow-primary/5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Tracker Ready</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{trackerData.tabs?.[0]?.fieldName || 'Custom Tracker'}</p>
            </div>
          </div>
          <div className="p-2 rounded-lg group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    )
  }

  const renderStreamingPreview = () => {
    return (
      <div 
        className="relative w-full p-5 rounded-xl border border-primary/20 bg-primary/5 animate-pulse backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
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

  const isChatEmpty = messages.length === 0 && !isLoading

  return (
    <div className="min-h-screen font-sans bg-background selection:bg-primary selection:text-primary-foreground overflow-x-hidden flex flex-col">
      <Background mouseXSpring={mouseXSpring} mouseYSpring={mouseYSpring} />

      <div className="flex-1 overflow-y-auto pb-48 z-10">
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            {isChatEmpty ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center min-h-[60vh] space-y-12"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/30 via-transparent to-purple-500/30 blur-2xl opacity-50"
                  />
                  <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center bg-foreground shadow-2xl">
                    <Sparkles className="w-12 h-12 text-background" />
                  </div>
                </div>
                
                <div className="text-center space-y-4">
                  <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                    Build your <span className="relative inline-block">
                      <span className="absolute inset-0 bg-primary -rotate-2 rounded-sm" />
                      <span className="relative px-2 text-primary-foreground">tracker.</span>
                    </span>
                  </h3>
                  <p className="text-lg md:text-xl text-muted-foreground/90 max-w-lg mx-auto font-medium">
                    What would you like to build today? <br />
                    Describe your data needs in plain english.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  {['Personal fitness logger', 'Company inventory tracker', 'Recipe collection with ratings', 'Project task manager'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => applySuggestion(suggestion)}
                      className="p-4 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50 transition-all text-left group"
                    >
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{suggestion}</p>
                      <p className="text-xs text-muted-foreground mt-1">Start with this template →</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="chat-messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8 pt-12"
              >
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-6 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                        <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0 shadow-lg mt-1">
                          <Sparkles className="w-5 h-5 text-background" />
                        </div>
                    )}
                    <div
                      className={`space-y-3 ${
                        message.role === 'user' ? 'items-end max-w-[80%]' : 'items-start flex-1'
                      } flex flex-col`}
                    >
                      {message.content && (
                        <div
                          className={`rounded-2xl px-5 py-4 shadow-sm font-medium ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground text-[15px] leading-relaxed'
                              : 'bg-secondary/30 backdrop-blur-xl border border-border/50 text-foreground text-[15px] leading-relaxed'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">
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
                      <div className="w-10 h-10 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-5 h-5 text-muted-foreground" />
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
                    <div className="flex gap-6 justify-start">
                        <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0 shadow-lg mt-1">
                          <Sparkles className="w-5 h-5 text-background" />
                        </div>
                      <div className="flex items-center gap-3 rounded-2xl px-5 py-4 bg-secondary/30 backdrop-blur-xl border border-border/50 text-foreground font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <p className="text-[15px]">
                          {object ? 'Building your tracker...' : 'Thinking...'}
                        </p>
                      </div>
                    </div>
                    {isLoading && renderStreamingPreview()}
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div 
        layout
        className={`fixed left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 py-8 z-20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isChatEmpty ? 'top-1/2 -translate-y-1/2 mt-32' : 'bottom-0'
        }`}
      >
        <div className="relative group/input">
           <motion.div 
            layout
            className={`absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20 group-hover/input:opacity-40 transition duration-1000 group-hover/input:duration-200 ${isFocused ? 'opacity-50' : ''}`}
          />
          <div className="relative flex items-end gap-3 p-4 rounded-2xl border border-border/50 bg-background/90 backdrop-blur-xl transition-all shadow-2xl">
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
                    const el = document.getElementById(INPUT_ID) as HTMLTextAreaElement | null
                    el?.blur()
                  }
                }}
                placeholder={
                  isChatEmpty
                    ? 'e.g. A finance tracker for a small e-commerce brand...'
                    : 'Ask for changes or refinements...'
                }
                rows={1}
                className="w-full py-4 bg-transparent focus:outline-none resize-none text-[16px] font-medium text-foreground placeholder:text-muted-foreground/60 border-none shadow-none focus:ring-0 min-h-[56px] max-h-[200px]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={`rounded-xl h-14 w-14 shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg ${input.trim() ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-secondary text-muted-foreground'}`}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ArrowRight className="w-6 h-6" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-3xl border-border/50 bg-background/95 backdrop-blur-2xl transition-all">
          <DialogHeader className="p-6 border-b border-border/50 bg-secondary/10 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight">
              <div className="p-2 rounded-lg bg-foreground text-background">
                <Sparkles className="w-5 h-5" />
              </div>
              Tracker Construction Kit
              {isLoading && (
                <span className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider animate-pulse border border-primary/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            {(isLoading && object) ? (
               <TrackerDisplay
                  tabs={(object.tabs || []).filter((t: any) => t && typeof t === 'object' && t.name) as any}
                  sections={(object.sections || []).filter((s: any) => s && typeof s === 'object' && s.name) as any}
                  grids={(object.grids || []).filter((g: any) => g && typeof g === 'object' && g.name) as any}
                  fields={(object.fields || []).filter((f: any) => f && typeof f === 'object' && f.name) as any}
                  examples={(object.examples || []).filter((e: any) => e && typeof e === 'object') as any}
                  views={(object.views || []).filter((v: any) => typeof v === 'string') as any}
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
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-6">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  <Loader2 className="w-12 h-12 animate-spin text-primary relative" />
                </div>
                <p className="text-lg font-bold tracking-tight animate-pulse">Initializing Interface...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
