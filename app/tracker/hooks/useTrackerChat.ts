'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, Target, BookOpen, CheckSquare } from 'lucide-react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { multiAgentSchema, MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { validateTracker, type TrackerLike } from '@/lib/validate-tracker'
import { buildBindingsFromSchema, enrichBindingsFromSchema } from '@/lib/build-bindings'
import { applyTrackerPatch } from '@/app/tracker/utils/mergeTracker'
import type { TrackerDisplayProps } from '@/app/components/tracker-display/types'

export interface TrackerResponse extends TrackerDisplayProps { }

export interface Message {
  role: 'user' | 'assistant'
  content?: string
  trackerData?: TrackerResponse
  managerData?: MultiAgentSchema['manager']
  errorMessage?: string
  isThinkingOpen?: boolean
}

const CONTINUE_PROMPT =
  'Continue and complete the response. If you were outputting a trackerPatch, finish the patch. Otherwise complete the full tracker: ensure tabs, sections, grids, fields, layoutNodes, and bindings (so that every options/multiselect field has a bindings entry pointing to an options grid) are all filled. Add any missing parts from where you left off.'

const MAX_AUTO_CONTINUES = 3

export const suggestions = [
  {
    icon: Zap,
    title: 'Personal Fitness Logger',
    desc: 'Track workouts, weights, and progress over time',
    query: 'Create a personal fitness tracker to log daily workouts, sets, reps, and body weight progress.',
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

export const quickSuggestions = [
  { text: 'Add status column', icon: '📊' },
  { text: 'Group by priority', icon: '🎯' },
  { text: 'Add email field', icon: '📧' },
  { text: 'Change color theme', icon: '🎨' }
]

export function useTrackerChat() {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTrackerData, setActiveTrackerData] = useState<TrackerResponse | null>(null)
  const [generationErrorMessage, setGenerationErrorMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [pendingContinue, setPendingContinue] = useState(false)
  const [resumingAfterError, setResumingAfterError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const continueCountRef = useRef(0)
  const lastObjectRef = useRef<MultiAgentSchema | undefined>(undefined)
  const trackerDataRef = useRef<(() => Record<string, Array<Record<string, unknown>>>) | null>(null)
  const messagesRef = useRef<Message[]>([])
  const activeTrackerRef = useRef<TrackerResponse | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    activeTrackerRef.current = activeTrackerData
  }, [activeTrackerData])

  const getBaseTracker = () => {
    if (activeTrackerRef.current) return activeTrackerRef.current
    const reversed = [...messagesRef.current].reverse()
    return reversed.find((msg) => msg.trackerData)?.trackerData ?? null
  }

  const trackerHasAnyData = (tracker?: TrackerLike | null) => {
    if (!tracker) return false
    return Boolean(
      (Array.isArray(tracker.tabs) && tracker.tabs.length > 0) ||
      (Array.isArray(tracker.sections) && tracker.sections.length > 0) ||
      (Array.isArray(tracker.grids) && tracker.grids.length > 0) ||
      (Array.isArray(tracker.fields) && tracker.fields.length > 0),
    )
  }

  const buildTrackerFromResponse = (response?: MultiAgentSchema) => {
    if (!response) return null
    const base = getBaseTracker()
    let rawTracker = response.tracker as TrackerLike | undefined

    if (!rawTracker && response.trackerPatch && base) {
      rawTracker = applyTrackerPatch(base, response.trackerPatch) as TrackerLike
    }

    if (!rawTracker) return null
    const built = buildBindingsFromSchema(rawTracker as TrackerLike)
    const tracker = built ? enrichBindingsFromSchema(built as TrackerLike) : built
    return tracker as TrackerResponse
  }

  const { object, submit, isLoading, error } = useObject({
    api: '/api/generate-tracker',
    schema: multiAgentSchema,
    onFinish: ({ object: finishedObject }: { object?: MultiAgentSchema }) => {
      setGenerationErrorMessage(null)
      setResumingAfterError(false)
      setValidationErrors([])
      if (finishedObject) {
        const tracker = buildTrackerFromResponse(finishedObject)
        const validation = tracker ? validateTracker(tracker as TrackerLike) : { valid: true, errors: [], warnings: [] }
        if (!validation.valid) {
          setValidationErrors(validation.errors)
        }
        const hasValidTracker =
          tracker &&
          Array.isArray(tracker.tabs) &&
          tracker.tabs.length > 0
        const assistantMessage: Message = {
          role: 'assistant',
          trackerData: tracker as TrackerResponse,
          managerData: finishedObject.manager,
        }
        console.log('assistantMessage', assistantMessage)
        setMessages((prev) => [...prev, assistantMessage])
        setPendingQuery(null)
        if (hasValidTracker) {
          continueCountRef.current = 0
          setActiveTrackerData(tracker as TrackerResponse)
        } else {
          if (continueCountRef.current < MAX_AUTO_CONTINUES) {
            setPendingContinue(true)
          } else {
            continueCountRef.current = 0
            setGenerationErrorMessage(
              'The AI responded but did not produce a complete tracker (missing or empty tabs). You can click "Continue" to try again from where it left off.'
            )
          }
        }
      } else {
        setPendingQuery(null)
        // When stream ends with no valid object (e.g. truncated at 8K), use partial if available
        const partial = lastObjectRef.current
        const partialTracker = buildTrackerFromResponse(partial)
        const hasPartial =
          partial &&
          (partial.manager || trackerHasAnyData(partialTracker))
        if (hasPartial && partial) {
          const assistantMessage: Message = {
            role: 'assistant',
            trackerData: partialTracker ?? undefined,
            managerData: partial.manager,
          }
          setMessages((prev) => [...prev, assistantMessage])
          if (partialTracker) setActiveTrackerData(partialTracker as TrackerResponse)
          if (continueCountRef.current < MAX_AUTO_CONTINUES) {
            setPendingContinue(true)
            setGenerationErrorMessage(
              'The response was cut off (output limit). Click "Continue" to complete the tracker from where it left off.'
            )
          } else {
            continueCountRef.current = 0
            setGenerationErrorMessage(
              'The response was cut off. You can click "Continue" to try again from where it left off.'
            )
          }
        } else {
          const noResponseMessage =
            'The AI did not return a valid response. Please try again or rephrase your request.'
          setGenerationErrorMessage(noResponseMessage)
          const errorMessageObj: Message = {
            role: 'assistant',
            content: noResponseMessage,
          }
          setMessages((prev) => [...prev, errorMessageObj])
        }
      }
    },
    onError: (err: Error) => {
      const partial = lastObjectRef.current
      const partialTracker = buildTrackerFromResponse(partial)
      const hasPartial =
        partial &&
        (partial.manager || trackerHasAnyData(partialTracker))

      if (hasPartial && partial) {
        setResumingAfterError(true)
        setGenerationErrorMessage(
          'Connection failed. Starting a new request to continue from where you left off…'
        )
        const assistantMessage: Message = {
          role: 'assistant',
          trackerData: partialTracker ?? undefined,
          managerData: partial.manager,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setPendingQuery(null)
        setPendingContinue(true)
        continueCountRef.current = 0
      } else {
        setGenerationErrorMessage(err.message || 'An unknown error occurred')
        const errorMessageObj: Message = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message || 'An unknown error occurred'}. Please try again.`,
        }
        setMessages((prev) => [...prev, errorMessageObj])
        setPendingQuery(null)
      }
      console.error('Error generating tracker:', err)
    },
  })

  useEffect(() => {
    lastObjectRef.current = object as MultiAgentSchema | undefined
  }, [object])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, object])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    continueCountRef.current = 0
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

  const handleContinue = () => {
    setGenerationErrorMessage(null)
    const continueMessage: Message = { role: 'user', content: CONTINUE_PROMPT }
    const nextMessages = [...messages, continueMessage]
    setMessages(nextMessages)
    submit({ query: CONTINUE_PROMPT, messages: nextMessages })
    continueCountRef.current = 0
  }

  useEffect(() => {
    if (!pendingContinue || isLoading || continueCountRef.current >= MAX_AUTO_CONTINUES) return

    setResumingAfterError(false)
    const continueMessage: Message = { role: 'user', content: CONTINUE_PROMPT }
    const nextMessages = [...messages, continueMessage]
    setMessages(nextMessages)
    submit({ query: CONTINUE_PROMPT, messages: nextMessages })
    setPendingContinue(false)
    continueCountRef.current += 1
  }, [pendingContinue, isLoading, messages])

  useEffect(() => {
    if (isLoading && (object?.tracker || object?.trackerPatch)) {
      setIsDialogOpen(true)
      setGenerationErrorMessage(null)
    }
  }, [isLoading, object?.tracker, object?.trackerPatch])

  useEffect(() => {
    if (!isLoading && (error || generationErrorMessage)) {
      setIsDialogOpen(true)
    }
  }, [isLoading, error, generationErrorMessage])

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

  const setMessageThinkingOpen = (idx: number, open: boolean) => {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, isThinkingOpen: open } : m))
  }

  const isChatEmpty = messages.length === 0 && !isLoading

  const clearDialogError = () => {
    setGenerationErrorMessage(null)
    setValidationErrors([])
  }

  return {
    input,
    setInput,
    isFocused,
    setIsFocused,
    messages,
    setMessages,
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
  }
}
