'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Zap, Target, BookOpen, CheckSquare } from 'lucide-react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { multiAgentSchema, MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { validateTracker, type TrackerLike } from '@/lib/validate-tracker'
import { buildBindingsFromSchema, enrichBindingsFromSchema } from '@/lib/binding'
import { applyTrackerPatch } from '@/app/tracker/utils/mergeTracker'
import type { FieldValidationRule } from '@/lib/functions/types'
import type { TrackerDisplayProps } from '@/app/components/tracker-display/types'
import { INITIAL_TRACKER_SCHEMA } from '@/app/components/tracker-display/tracker-editor'

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
const DEFAULT_OVERVIEW_TAB_ID = 'overview_tab'
const DEFAULT_SHARED_TAB_ID = 'shared_tab'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value)

const isEmptyObject = (value: unknown): boolean =>
  !isPlainObject(value) || Object.keys(value).length === 0

const isDefaultTabConfig = (value: unknown): boolean => {
  if (!isPlainObject(value)) return true
  for (const [key, v] of Object.entries(value)) {
    if (key !== 'isHidden') return false
    if (v !== false && v !== undefined) return false
  }
  return true
}

/**
 * Detect untouched first-run scaffold so we don't force patch mode:
 * - tabs are only default Overview (+ optional default Shared)
 * - no sections/grids/fields/layout nodes/bindings/validations/styles/dependsOn
 */
const isUntouchedFirstRunScaffold = (tracker: TrackerLike | null | undefined): boolean => {
  if (!tracker) return true
  const trackerWithExtras = tracker as TrackerLike & { styles?: unknown }

  const sections = Array.isArray(tracker.sections) ? tracker.sections : []
  const grids = Array.isArray(tracker.grids) ? tracker.grids : []
  const fields = Array.isArray(tracker.fields) ? tracker.fields : []
  const layoutNodes = Array.isArray(tracker.layoutNodes) ? tracker.layoutNodes : []
  const dependsOn = Array.isArray(tracker.dependsOn) ? tracker.dependsOn : []

  if (sections.length > 0 || grids.length > 0 || fields.length > 0 || layoutNodes.length > 0) {
    return false
  }

  if (!isEmptyObject(tracker.bindings) || !isEmptyObject(tracker.validations) || !isEmptyObject(trackerWithExtras.styles)) {
    return false
  }
  if (dependsOn.length > 0) return false

  const tabs = Array.isArray(tracker.tabs) ? tracker.tabs : []
  if (tabs.length === 0 || tabs.length > 2) return false

  let sawOverview = false
  for (const tab of tabs) {
    if (!tab || typeof tab.id !== 'string') return false
    if (!isDefaultTabConfig(tab.config)) return false

    if (tab.id === DEFAULT_OVERVIEW_TAB_ID) {
      sawOverview = true
      if ((tab.name ?? 'Overview') !== 'Overview') return false
      continue
    }

    if (tab.id === DEFAULT_SHARED_TAB_ID) {
      if ((tab.name ?? 'Shared') !== 'Shared') return false
      continue
    }

    return false
  }

  return sawOverview
}

export const suggestions = [
  {
    icon: Zap,
    title: 'Personal Fitness Logger',
    summary: 'Fitness log',
    desc: 'Track workouts, weights, and progress over time',
    query: 'Create a personal fitness tracker to log daily workouts, sets, reps, and body weight progress.',
    gradient: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-500'
  },
  {
    icon: Target,
    title: 'Company Inventory',
    summary: 'Inventory',
    desc: 'Manage stock levels, suppliers, and SKU details',
    query: 'Build a company inventory system to track stock levels, supplier contacts, and warehouse locations.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500'
  },
  {
    icon: BookOpen,
    title: 'Recipe Collection',
    summary: 'Recipe book',
    desc: 'Save favorite recipes with ingredients and cooking steps',
    query: 'Design a digital cookbook for saving recipes, including ingredient lists, difficulty ratings, and preparation time.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500'
  },
  {
    icon: CheckSquare,
    title: 'Project Task Manager',
    summary: 'Project tasks',
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
  const [activeTrackerData, _setActiveTrackerData] = useState<TrackerResponse | null>(null)
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
  const firstRunUserDraftRef = useRef<TrackerResponse | null>(null)

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

  /**
   * Current state sent to the API.
   * - If we already have a tracker, send it so the model can generate a patch.
   * - For the first request, send null when state is untouched default scaffold.
   * - For the first request with manual edits, include the edited state.
   */
  const getCurrentTrackerForApi = (): TrackerResponse | null => {
    const hasGeneratedTracker = messagesRef.current.some((m) => !!m.trackerData)
    if (!hasGeneratedTracker) {
      return firstRunUserDraftRef.current
    }
    return getBaseTracker()
  }

  const setResolvedTrackerData = (next: TrackerResponse | null) => {
    _setActiveTrackerData(next)
  }

  const setActiveTrackerData = (next: TrackerResponse | null) => {
    _setActiveTrackerData(next)
    const hasGeneratedTracker = messagesRef.current.some((m) => !!m.trackerData)
    if (!hasGeneratedTracker) {
      firstRunUserDraftRef.current = isUntouchedFirstRunScaffold(next as TrackerLike | null)
        ? null
        : next
    }
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
    // Keep merge base aligned with what we send to the API:
    // if we don't have a tracker yet, use the same initial schema baseline.
    const base = getBaseTracker() ?? (INITIAL_TRACKER_SCHEMA as TrackerResponse)
    let rawTracker = response.tracker as TrackerLike | undefined

    if (!rawTracker && response.trackerPatch && base) {
      rawTracker = applyTrackerPatch(base, response.trackerPatch) as TrackerLike
    }

    if (!rawTracker) return null
    // Ensure validations keys are always "gridId.fieldId" (like bindings).
    const normalizeValidations = (tracker: TrackerLike): TrackerLike => {
      const grids = tracker.grids ?? []
      const fields = tracker.fields ?? []
      const layoutNodes = tracker.layoutNodes ?? []
      const validations = tracker.validations ?? {}

      const gridIds = new Set(grids.map((g) => g.id))
      const fieldIds = new Set(fields.map((f) => f.id))
      const gridsByFieldId = new Map<string, Set<string>>()
      for (const n of layoutNodes) {
        if (!gridIds.has(n.gridId) || !fieldIds.has(n.fieldId)) continue
        if (!gridsByFieldId.has(n.fieldId)) gridsByFieldId.set(n.fieldId, new Set())
        gridsByFieldId.get(n.fieldId)!.add(n.gridId)
      }

      const normalized: Record<string, FieldValidationRule[]> = {}
      for (const [key, rules] of Object.entries(validations)) {
        if (!key.includes('.')) {
          const fieldId = key
          if (!fieldIds.has(fieldId)) continue
          const gridSet = gridsByFieldId.get(fieldId)
          if (!gridSet || gridSet.size === 0) continue
          for (const gridId of gridSet) {
            const path = `${gridId}.${fieldId}`
            const existing = normalized[path]
            normalized[path] = existing ? [...existing, ...rules] : rules
          }
          continue
        }

        const [gridId, fieldId] = key.split('.')
        if (!gridId || !fieldId || !gridIds.has(gridId) || !fieldIds.has(fieldId)) continue
        const existing = normalized[key]
        normalized[key] = existing ? [...existing, ...rules] : rules
      }

      return { ...tracker, validations: normalized }
    }
    rawTracker = normalizeValidations(rawTracker)
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
          setResolvedTrackerData(tracker as TrackerResponse)
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
          if (partialTracker) setResolvedTrackerData(partialTracker as TrackerResponse)
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

  /** Resolved tracker for streaming UI: full tracker or base + trackerPatch. Use this so 2nd+ requests show streaming when LLM returns a patch. */
  const streamedDisplayTracker = useMemo(() => {
    return buildTrackerFromResponse(object as MultiAgentSchema | undefined)
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
      currentTracker: getCurrentTrackerForApi(),
    })
  }

  const handleContinue = () => {
    setGenerationErrorMessage(null)
    const continueMessage: Message = { role: 'user', content: CONTINUE_PROMPT }
    const nextMessages = [...messages, continueMessage]
    setMessages(nextMessages)
    submit({
      query: CONTINUE_PROMPT,
      messages: nextMessages,
      currentTracker: getCurrentTrackerForApi(),
    })
    continueCountRef.current = 0
  }

  useEffect(() => {
    if (!pendingContinue || isLoading || continueCountRef.current >= MAX_AUTO_CONTINUES) return

    setResumingAfterError(false)
    const continueMessage: Message = { role: 'user', content: CONTINUE_PROMPT }
    const nextMessages = [...messages, continueMessage]
    setMessages(nextMessages)
    submit({
      query: CONTINUE_PROMPT,
      messages: nextMessages,
      currentTracker: getCurrentTrackerForApi(),
    })
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
    streamedDisplayTracker,
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
