'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Loader2, User, Maximize2, ArrowRight, Zap, Target, BookOpen, CheckSquare, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence, useSpring } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { TrackerDisplay } from '@/app/components/tracker-display'
import {
  TrackerDisplayProps,
} from '@/app/components/tracker-display/types'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { multiAgentSchema, MultiAgentSchema } from '@/lib/schemas/multi-agent'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TrackerResponse extends TrackerDisplayProps {}

interface Message {
  role: 'user' | 'assistant'
  content?: string
  trackerData?: TrackerResponse
  managerData?: MultiAgentSchema['manager']
  errorMessage?: string
  isThinkingOpen?: boolean
}

export default function TrackerPage() {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTrackerData, setActiveTrackerData] = useState<TrackerResponse | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    schema: multiAgentSchema,
    onFinish: ({ object }: { object?: MultiAgentSchema }) => {
      if (object) {
        const assistantMessage: Message = {
          role: 'assistant',
          trackerData: object.tracker as TrackerResponse,
          managerData: object.manager,
        }
        console.log(object.tracker)
        setMessages((prev) => [...prev, assistantMessage])
        setPendingQuery(null)
        if (object.tracker) {
          setActiveTrackerData(object.tracker as TrackerResponse)
        }
      }
    },
    onError: (err: Error) => {
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
    if (isLoading && object?.tracker) {
      setIsDialogOpen(true)
    }
    if (!isLoading) {
      // Don't auto-close, but we reset active data on finish which is handled in onFinish
    }
  }, [isLoading, object?.tracker])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px'
    }
  }, [input])

  const applySuggestion = (s: string) => {
    setInput(s)
    textareaRef.current?.focus()
  }

  const suggestions = [
    {
      icon: Zap,
      title: 'Personal Fitness Logger',
      desc: 'Track workouts, weights, and progress with charts',
      query: 'Create a personal fitness tracker to log daily workouts, sets, reps, and body weight progress with visualization.',
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-500'
    },
    {
      icon: Target,
      title: 'Company Inventory',
      desc: 'Manage stock levels, suppliers, and SKU details',
      query: 'Build a company inventory system to track stock levels, supplier contacts, and warehouse locations.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500'
    },
    {
      icon: BookOpen,
      title: 'Recipe Collection',
      desc: 'Save favorite recipes with ingredients and cooking steps',
      query: 'Design a digital cookbook for saving recipes, including ingredient lists, difficulty ratings, and preparation time.',
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500'
    },
    {
      icon: CheckSquare,
      title: 'Project Task Manager',
      desc: 'Stay organized with deadlines, priorities, and status',
      query: 'Create a project management tracker with task deadlines, priority levels, and kanban stages.',
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500'
    }
  ]

  const quickSuggestions = [
    { text: 'Add status column', icon: '📊' },
    { text: 'Group by priority', icon: '🎯' },
    { text: 'Add email field', icon: '📧' },
    { text: 'Change color theme', icon: '🎨' }
  ]

  const renderTrackerPreview = (trackerData: TrackerResponse) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          setActiveTrackerData(trackerData)
          setIsDialogOpen(true)
        }}
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

  const renderStreamingPreview = () => {
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

  const isChatEmpty = messages.length === 0 && !isLoading

  return (
    <div className="min-h-screen font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden flex flex-col pt-0 md:pt-12">
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32 z-10">
        <div className="relative max-w-4xl mx-auto px-2 md:px-6 py-0">
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
                    className="absolute -inset-4 rounded-full"
                  />
                  <div className="relative w-16 h-16 rounded-md flex items-center justify-center bg-foreground shadow-xl">
                    <Sparkles className="w-8 h-8 text-background" />
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    Build your <span className="relative inline-block">
                      <span className="absolute inset-0 bg-primary -rotate-2 rounded-md" />
                      <span className="relative px-2 text-primary-foreground">tracker.</span>
                    </span>
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground/90 max-w-md mx-auto font-medium">
                    What would you like to build today? <br />
                    Describe your data needs in plain english.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.title}
                      onClick={() => applySuggestion(suggestion.query)}
                      className="relative p-4 rounded-md border border-border/50 bg-card hover:bg-card/80 hover:border-primary/40 transition-all text-left group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className={`p-2 rounded-md bg-background/50 backdrop-blur-sm ${suggestion.iconColor} border border-current/20`}>
                            <suggestion.icon className="w-4 h-4" />
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {suggestion.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
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
                        <div className="w-full space-y-4">
                          <div className="flex flex-col gap-2 p-4 rounded-md bg-secondary/20 border border-border/40 backdrop-blur-sm">
                            <button
                              onClick={() => {
                                setMessages(prev => prev.map((m, i) => i === idx ? { ...m, isThinkingOpen: !m.isThinkingOpen } : m))
                              }}
                              className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Target className="w-3 h-3" />
                                Manager Insights
                              </div>
                              {message.isThinkingOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            <AnimatePresence>
                              {message.isThinkingOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-2 space-y-3">
                                    <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                                      "{message.managerData.thinking}"
                                    </p>
                                    {message.managerData.prd && (
                                      <div className="mt-2 pt-2 border-t border-border/20">
                                        <p className="text-sm font-bold text-primary">{message.managerData.prd.name}</p>
                                        <p className="text-xs text-muted-foreground">{message.managerData.prd.description}</p>
                                      </div>
                                    )}
                                    {message.managerData.builderTodo && message.managerData.builderTodo.length > 0 && (
                                      <div className="mt-3 space-y-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Execution Plan</p>
                                        <div className="flex flex-col gap-1.5">
                                          {message.managerData.builderTodo.map((todo, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs font-medium text-foreground/90 bg-background/40 p-2 rounded border border-border/20">
                                              <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${todo.action === 'create' ? 'bg-green-500' :
                                                  todo.action === 'update' ? 'bg-blue-500' :
                                                    todo.action === 'delete' ? 'bg-red-500' : 'bg-muted-foreground'
                                                }`} />
                                              <div>
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
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                      {message.trackerData && (
                        <div className="w-full">
                          {renderTrackerPreview(message.trackerData)}
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
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 rounded-md px-4 py-2.5 bg-secondary/30 backdrop-blur-xl border border-border/50 text-foreground font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <p className="text-sm">
                            {!object?.manager ? 'Consulting Product Manager...' :
                              !object?.tracker ? 'Architecting structure...' :
                                'Constructing your tracker...'}
                          </p>
                        </div>

                        {object?.manager && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-5 rounded-md bg-secondary/10 border border-border/30 backdrop-blur-md space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                Strategy Phase
                              </div>
                            </div>

                            {object.manager.thinking && (
                              <p className="text-sm text-foreground/70 font-medium leading-relaxed border-l-2 border-primary/30 pl-4 py-1">
                                {object.manager.thinking}
                              </p>
                            )}

                            {object.manager.prd && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-2 gap-3 mt-4"
                              >
                                <div className="p-3 rounded-md bg-background/50 border border-border/30">
                                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Concept</p>
                                  <p className="text-xs font-bold truncate">{object.manager.prd.name || "Designing..."}</p>
                                </div>
                                <div className="p-3 rounded-md bg-background/50 border border-border/30">
                                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Target</p>
                                  <p className="text-xs font-bold truncate">{object.manager.prd.description || "Analyzing..."}</p>
                                </div>
                              </motion.div>
                            )}

                            {object.manager.builderTodo && object.manager.builderTodo.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2 pt-2"
                              >
                                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground">Action Items</p>
                                <div className="flex flex-col gap-2">
                                  {object.manager.builderTodo.map((todo, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs font-bold text-foreground bg-background/50 p-2.5 rounded-md border border-border/20 shadow-sm">
                                      {todo?.action === 'create' && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                                      {todo?.action === 'update' && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
                                      {todo?.action === 'delete' && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                                      {!todo?.action && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                                      <span className="flex-1 truncate">{todo?.task || "Preparing task..."}</span>
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
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area */}
      <div className={`fixed left-0 right-0 bottom-0 z-30 pt-8 pb-6`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="space-y-3">
            {/* Quick Suggestions */}
            {!isChatEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1"
              >
                {quickSuggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => applySuggestion(s.text)}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-md hover:bg-card hover:border-primary/50 transition-all whitespace-nowrap shadow-sm"
                  >
                    <span className="text-sm group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
                      {s.text}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Textarea Container */}
            <div className="relative group">
              <motion.div
                className={`absolute -inset-[1px] rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm ${isFocused ? 'opacity-100' : ''}`}
              />

              <div className="relative bg-card rounded-[12px] shadow-xl border border-border/50 overflow-hidden border-2 border-muted/100">
                <div className="flex items-end gap-2 p-1.5">
                  <textarea
                    ref={textareaRef}
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
                        textareaRef.current?.blur()
                      }
                    }}
                    placeholder={isChatEmpty ? 'Describe your ideal tracker...' : 'Ask for changes or refinements...'}
                    rows={1}
                    className="flex-1 px-3 py-3 bg-transparent resize-none text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-h-[44px] max-h-[200px]"
                  />

                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    className={`shrink-0 h-10 w-10 rounded-[8px] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${input.trim() && !isLoading
                        ? 'bg-foreground text-background hover:bg-foreground/90'
                        : 'bg-secondary text-muted-foreground'
                      }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog for Tracker Display */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-3xl border-border/50 bg-background/95 backdrop-blur-2xl transition-all">
          <DialogHeader className="p-6 border-b border-border/50 bg-secondary/10 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-sm md:text-xl font-bold tracking-tight">
              <div className="p-2 rounded-md bg-foreground text-background">
                <Sparkles className="w-5 h-5" />
              </div>
              {isLoading && (
                <span className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider animate-pulse border border-primary/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            {(isLoading && object?.tracker) ? (
              <TrackerDisplay
                tabs={(object.tracker.tabs || []).filter((t: any) => t && typeof t === 'object' && t.name) as any}
                sections={(object.tracker.sections || []).filter((s: any) => s && typeof s === 'object' && s.name) as any}
                grids={(object.tracker.grids || []).filter((g: any) => g && typeof g === 'object' && g.name) as any}
                fields={(object.tracker.fields || []).filter((f: any) => f && typeof f === 'object' && f.ui?.label) as any}
                layoutNodes={(object.tracker.layoutNodes || []) as any}
                optionTables={(object.tracker.optionTables || []) as any}
                optionMaps={(object.tracker.optionMaps || []) as any}
              />
            ) : activeTrackerData ? (
              <TrackerDisplay
                tabs={activeTrackerData.tabs}
                sections={activeTrackerData.sections}
                grids={activeTrackerData.grids}
                fields={activeTrackerData.fields}
                layoutNodes={activeTrackerData.layoutNodes}
                optionTables={activeTrackerData.optionTables}
                optionMaps={activeTrackerData.optionMaps}
              />
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="text-center max-w-md">
                   <p className="font-bold">Generation Failed</p>
                   <p className="text-sm text-muted-foreground">{error.message || "An error occurred while generating the tracker."}</p>
                </div>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-6">
                {messages.length > 0 && !isLoading ? (
                   <div className="flex flex-col items-center gap-4 text-amber-500">
                      <div className="p-3 rounded-full bg-amber-500/10">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="text-center max-w-md">
                        <p className="font-bold">No Tracker Generated</p>
                        <p className="text-sm text-muted-foreground">The AI responded but did not generate a valid tracker configuration.</p>
                      </div>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                   </div>
                ) : (
                    <>
                        <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
                        <Loader2 className="w-12 h-12 animate-spin text-primary relative" />
                        </div>
                        <p className="text-lg font-bold tracking-tight animate-pulse">Initializing Interface...</p>
                    </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}