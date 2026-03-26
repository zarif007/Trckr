'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { multiAgentSchema, MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { validateTracker, autoFixBindings, type TrackerLike } from '@/lib/validate-tracker'
import { buildBindingsFromSchema, enrichBindingsFromSchema } from '@/lib/binding'
import { applyTrackerPatch } from '@/app/tracker/utils/mergeTracker'
import { removeEmptyOverviewTabIfUnused } from '@/app/tracker/utils/removeEmptyOverviewTab'
import { mapApiToolCallsToEntries } from '@/app/tracker/utils/mapConversationToolCalls'
import type { TrackerDisplayProps } from '@/app/components/tracker-display/types'
import { INITIAL_TRACKER_SCHEMA } from '@/app/components/tracker-display/tracker-editor'
import {
  parseMasterDataBuildAuditFromUnknown,
  type MasterDataBuildAudit,
} from '@/lib/master-data/chat-audit'
import { normalizeMasterDataScope } from '@/lib/master-data-scope'
import { ensureConversation, persistMessage } from './conversation'
import {
  CONTINUE_PROMPT,
  MAX_AUTO_CONTINUES,
  MAX_VALIDATION_FIX_RETRIES,
} from './constants'
import {
  isUntouchedFirstRunScaffold,
  normalizeValidationAndCalculations,
  trackerHasAnyData,
} from './normalization'
import { collectExprIntents } from '@/lib/expr-intents'
import { resolveExprIntents, type ToolCallEntry } from './resolveExprIntents'

export type { ToolCallEntry } from './resolveExprIntents'
export { suggestions } from './constants'

export type TrackerResponse = TrackerDisplayProps

export interface Message {
  role: 'user' | 'assistant'
  content?: string
  trackerData?: TrackerResponse
  managerData?: MultiAgentSchema['manager']
  errorMessage?: string
  isThinkingOpen?: boolean
  isToolsOpen?: boolean
  /** Expression-agent tool calls persisted with this assistant turn */
  toolCalls?: ToolCallEntry[]
  /** Module/project master data binding (reuse/create) for this assistant turn */
  masterDataBuildResult?: MasterDataBuildAudit
  isMasterDataFunctionsOpen?: boolean
  isMasterDataCreatedOpen?: boolean
}

export interface UseTrackerChatOptions {
  /** When provided, the chat starts with this tracker as the base (e.g. when editing an existing tracker by id). */
  initialTracker?: TrackerResponse | null
  /** Tracker (schema) id when viewing an existing tracker; enables persisting conversation to DB. */
  trackerId?: string | null
  /** Conversation id (from DB). When set, messages are persisted. Pass from parent to control active conversation (e.g. tab switch). */
  conversationId?: string | null
  /** Messages loaded from DB for this tracker; used to hydrate chat on open. */
  initialMessages?: Message[]
  /** When provided and conversationId is unset (draft tab), called on first submit to create conversation and persist message; hook skips persist. */
  onConversationCreate?: (userMessage: string) => Promise<{ id: string; title: string } | null>
}

function sanitizeManagerData(
  manager: MultiAgentSchema['manager'] | undefined,
): MultiAgentSchema['manager'] | undefined {
  if (!manager) return undefined
  const sanitized = { ...(manager as Record<string, unknown>) }
  if ('thinking' in sanitized) delete sanitized.thinking
  return sanitized as MultiAgentSchema['manager']
}

export function useTrackerChat(options: UseTrackerChatOptions = {}) {
  const {
    initialTracker = null,
    trackerId,
    conversationId: conversationIdProp,
    initialMessages,
    onConversationCreate,
  } = options
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => initialMessages ?? [])
  const [conversationId, setConversationId] = useState<string | null>(conversationIdProp ?? null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTrackerData, _setActiveTrackerData] = useState<TrackerResponse | null>(initialTracker ?? null)
  const [generationErrorMessage, setGenerationErrorMessage] = useState<string | null>(null)
  const [isResolvingMasterData, setIsResolvingMasterData] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [pendingContinue, setPendingContinue] = useState(false)
  const [resumingAfterError, setResumingAfterError] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([])
  const [isResolvingExpressions, setIsResolvingExpressions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const continueCountRef = useRef(0)
  const validationFixRetryCountRef = useRef(0)
  const lastObjectRef = useRef<MultiAgentSchema | undefined>(undefined)
  const masterDataSpecsRef = useRef<MultiAgentSchema['masterDataTrackers'] | undefined>(undefined)
  const trackerDataRef = useRef<(() => Record<string, Array<Record<string, unknown>>>) | null>(null)
  const messagesRef = useRef<Message[]>([])
  const activeTrackerRef = useRef<TrackerResponse | null>(null)
  const firstRunUserDraftRef = useRef<TrackerResponse | null>(initialTracker ?? null)
  const conversationIdRef = useRef<string | null>(conversationIdProp ?? null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitRef = useRef<(input: any) => void>(() => { })

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])
  // Controlled conversationId: when parent passes conversationId (e.g. active tab), sync internal state
  // When parent clears it (draft tab), reset to null to avoid leaking prior conversation ids.
  useEffect(() => {
    if (conversationIdProp === undefined) {
      setConversationId(null)
      return
    }
    setConversationId(conversationIdProp ?? null)
  }, [conversationIdProp])
  // Hydrate messages once when conversation loads from DB (e.g. after opening a tracker)
  const hasHydratedRef = useRef(false)
  useEffect(() => {
    if (hasHydratedRef.current || !initialMessages?.length) return
    hasHydratedRef.current = true
    setMessages(
      initialMessages.map((m) => {
        const normalized = mapApiToolCallsToEntries(m.toolCalls)
        const masterDataBuildResult = parseMasterDataBuildAuditFromUnknown(
          (m as { masterDataBuildResult?: unknown }).masterDataBuildResult,
        )
        return {
          ...m,
          ...(normalized?.length ? { toolCalls: normalized } : {}),
          ...(masterDataBuildResult ? { masterDataBuildResult } : {}),
        }
      }),
    )
  }, [initialMessages])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    activeTrackerRef.current = activeTrackerData
  }, [activeTrackerData])

  const getBaseTracker = useCallback(() => {
    if (activeTrackerRef.current) return activeTrackerRef.current
    const reversed = [...messagesRef.current].reverse()
    return reversed.find((msg) => msg.trackerData)?.trackerData ?? null
  }, [])

  /**
   * Current state sent to the API.
   * - After an assistant turn with trackerData, send the base tracker for patches.
   * - On the first request, always send a concrete baseline (user draft, live schema, or INITIAL)
   *   so the server can inject the empty-scaffold hint vs full JSON state.
   */
  const getCurrentTrackerForApi = useCallback((): TrackerResponse | null => {
    const hasGeneratedTracker = messagesRef.current.some((m) => !!m.trackerData)
    if (!hasGeneratedTracker) {
      return (
        firstRunUserDraftRef.current ??
        activeTrackerRef.current ??
        (INITIAL_TRACKER_SCHEMA as TrackerResponse)
      )
    }
    return getBaseTracker()
  }, [getBaseTracker])

  const getDirtyForApi = useCallback((): boolean => {
    if (messagesRef.current.some((m) => !!m.trackerData)) return true
    const draft =
      firstRunUserDraftRef.current ??
      activeTrackerRef.current ??
      (INITIAL_TRACKER_SCHEMA as TrackerResponse)
    return !isUntouchedFirstRunScaffold(draft as TrackerLike)
  }, [])

  const setResolvedTrackerData = useCallback(
    (next: TrackerResponse | null) => {
      _setActiveTrackerData(next)
    },
    [_setActiveTrackerData]
  )

  const setActiveTrackerData = useCallback(
    (next: TrackerResponse | null) => {
      _setActiveTrackerData(next)
      const hasGeneratedTracker = messagesRef.current.some((m) => !!m.trackerData)
      if (!hasGeneratedTracker) {
        firstRunUserDraftRef.current = isUntouchedFirstRunScaffold(next as TrackerLike | null)
          ? null
          : next
      }
    },
    [_setActiveTrackerData]
  )

  const buildTrackerFromResponse = useCallback((response?: MultiAgentSchema) => {
    if (!response) return null
    // Keep merge base aligned with what we send to the API:
    // if we don't have a tracker yet, use the same initial schema baseline.
    const base = getBaseTracker() ?? (INITIAL_TRACKER_SCHEMA as TrackerResponse)
    let rawTracker = response.tracker as TrackerLike | undefined

    if (!rawTracker && response.trackerPatch && base) {
      rawTracker = applyTrackerPatch(base, response.trackerPatch) as TrackerLike
    }

    if (!rawTracker) return null
    if (Array.isArray(response.masterDataTrackers) && response.masterDataTrackers.length) {
      masterDataSpecsRef.current = response.masterDataTrackers
    } else {
      masterDataSpecsRef.current = undefined
    }
    rawTracker = normalizeValidationAndCalculations(rawTracker)
    rawTracker = removeEmptyOverviewTabIfUnused(rawTracker as TrackerLike)
    const built = buildBindingsFromSchema(rawTracker as TrackerLike)
    const tracker = built ? enrichBindingsFromSchema(built as TrackerLike) : built
    return tracker as TrackerResponse
  }, [getBaseTracker])

  const resolveMasterDataIfNeeded = useCallback(
    async (
      tracker: TrackerResponse | null,
    ): Promise<{ tracker: TrackerResponse | null; masterDataBuildResult?: MasterDataBuildAudit }> => {
      if (!tracker) return { tracker: null, masterDataBuildResult: undefined }
      const scope = normalizeMasterDataScope(tracker.masterDataScope)
      if (!scope || scope === 'tracker') return { tracker, masterDataBuildResult: undefined }
      if (!trackerId) return { tracker, masterDataBuildResult: undefined }

      const isPlaceholderSourceId = (value: unknown) => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim()
        return trimmed === '__master_data__' || trimmed === 'master_data' || trimmed === 'MASTER_DATA'
      }

      const fields = tracker.fields ?? []
      const layoutNodes = tracker.layoutNodes ?? []
      const gridByFieldId = new Map<string, string>()
      for (const node of layoutNodes) {
        if (node?.fieldId && node?.gridId) {
          gridByFieldId.set(node.fieldId, node.gridId)
        }
      }

      let needsResolution = false
      for (const field of fields) {
        if (field.dataType !== 'options' && field.dataType !== 'multiselect') continue
        const gridId = gridByFieldId.get(field.id)
        if (!gridId) continue
        const fieldPath = `${gridId}.${field.id}`
        const binding = tracker.bindings?.[fieldPath]
        if (!binding || !binding.optionsSourceSchemaId || isPlaceholderSourceId(binding.optionsSourceSchemaId)) {
          needsResolution = true
          break
        }
      }

      if (!needsResolution) return { tracker, masterDataBuildResult: undefined }

      try {
        setIsResolvingMasterData(true)
        const res = await fetch('/api/master-data/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracker,
            trackerSchemaId: trackerId,
            masterDataScope: scope,
            masterDataTrackers: masterDataSpecsRef.current,
          }),
        })
        if (!res.ok) return { tracker, masterDataBuildResult: undefined }
        const data = (await res.json()) as Record<string, unknown>
        const nextTracker = (data.tracker as TrackerResponse | undefined) ?? tracker
        const masterDataBuildResult = parseMasterDataBuildAuditFromUnknown({
          actions: data.actions,
          createdTrackerIds: data.createdTrackerIds,
        })
        return { tracker: nextTracker, masterDataBuildResult }
      } catch {
        return { tracker, masterDataBuildResult: undefined }
      } finally {
        setIsResolvingMasterData(false)
      }
    },
    [trackerId],
  )

  const finalizeTracker = useCallback((
    tracker: TrackerResponse | null,
    managerData: MultiAgentSchema['manager'],
    toolCallsForPersist?: ToolCallEntry[],
    masterDataBuildResult?: MasterDataBuildAudit,
  ) => {
    const validation = tracker ? validateTracker(tracker as TrackerLike) : { valid: true, errors: [], warnings: [] }

    if (
      !validation.valid &&
      validation.errors.length > 0 &&
      tracker &&
      validationFixRetryCountRef.current < MAX_VALIDATION_FIX_RETRIES
    ) {
      validationFixRetryCountRef.current += 1
      const fixPrompt = `Fix these schema validation errors:\n${validation.errors.map((e) => `- ${e}`).join('\n')}`
      const assistantMessage: Message = {
        role: 'assistant',
        trackerData: tracker as TrackerResponse,
        managerData,
      }
      const fixUserMessage: Message = { role: 'user', content: fixPrompt }
      const nextMessages = [...messagesRef.current, assistantMessage, fixUserMessage]
      setMessages(nextMessages)
      const cidFix = conversationIdRef.current
      if (cidFix) {
        persistMessage(cidFix, { role: 'USER', content: fixPrompt }).catch((e) =>
          console.error('Failed to persist user message:', e)
        )
      }
      submitRef.current({
        query: fixPrompt,
        messages: nextMessages,
        currentTracker: tracker as TrackerResponse,
        dirty: true,
        ...(trackerId ? { trackerSchemaId: trackerId } : {}),
      })
      return
    }

    if (!validation.valid) {
      setValidationErrors(validation.errors)
    } else {
      validationFixRetryCountRef.current = 0
    }
    const hasValidTracker =
      tracker &&
      Array.isArray(tracker.tabs) &&
      tracker.tabs.length > 0
    const assistantMessage: Message = {
      role: 'assistant',
      trackerData: tracker as TrackerResponse,
      managerData,
      ...(toolCallsForPersist?.length ? { toolCalls: toolCallsForPersist } : {}),
      ...(masterDataBuildResult ? { masterDataBuildResult } : {}),
    }
    setMessages((prev) => [...prev, assistantMessage])
    if (toolCallsForPersist?.length) {
      setToolCalls([])
    }
    const cid = conversationIdRef.current
    if (cid) {
      const payload: Parameters<typeof persistMessage>[1] = {
        role: 'ASSISTANT',
        content: '',
        trackerSchemaSnapshot: (tracker as TrackerResponse) ?? undefined,
        managerData: sanitizeManagerData(managerData),
      }
      if (toolCallsForPersist?.length) {
        payload.toolCalls = toolCallsForPersist.map((tc) => ({
          purpose: tc.purpose,
          fieldPath: tc.fieldPath,
          description: tc.description,
          status: tc.status,
          ...(tc.error != null && { error: tc.error }),
          ...(tc.result !== undefined && { result: tc.result }),
        }))
      }
      if (masterDataBuildResult?.actions?.length) {
        payload.masterDataBuildResult = {
          actions: masterDataBuildResult.actions,
          createdTrackerIds: masterDataBuildResult.createdTrackerIds ?? [],
        }
      }
      persistMessage(cid, payload).catch((err) => console.error('Failed to persist assistant message:', err))
    }
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
  }, [setResolvedTrackerData, trackerId])

  const { object, submit, isLoading, error } = useObject({
    api: '/api/generate-tracker',
    schema: multiAgentSchema,
    onFinish: ({ object: finishedObject }: { object?: MultiAgentSchema }) => {
      setGenerationErrorMessage(null)
      setResumingAfterError(false)
      setValidationErrors([])
      setToolCalls([])
      setIsResolvingExpressions(false)
      if (finishedObject) {
        let tracker = buildTrackerFromResponse(finishedObject)
        if (tracker) {
          tracker = autoFixBindings(tracker as TrackerLike) as TrackerResponse
        }

        resolveMasterDataIfNeeded(tracker)
          .then(({ tracker: resolvedTracker, masterDataBuildResult }) => {
            const trackerForIntents = resolvedTracker
              ? (autoFixBindings(resolvedTracker as TrackerLike) as TrackerResponse)
              : resolvedTracker
            const intents = trackerForIntents ? collectExprIntents(trackerForIntents as TrackerLike) : []

            if (intents.length > 0 && trackerForIntents) {
              setIsResolvingExpressions(true)
              resolveExprIntents(trackerForIntents as TrackerLike, setToolCalls, {
                trackerSchemaId: trackerId,
              })
                .then(({ tracker: resolved, errors, toolCalls: resolvedToolCalls }) => {
                  let resolvedTrackerFinal = resolved as TrackerResponse
                  if (resolvedTrackerFinal) {
                    resolvedTrackerFinal = autoFixBindings(resolvedTrackerFinal as TrackerLike) as TrackerResponse
                  }
                  if (errors.length > 0) {
                    setValidationErrors((prev) => [...prev, ...errors])
                  }
                  finalizeTracker(
                    resolvedTrackerFinal,
                    finishedObject.manager,
                    resolvedToolCalls,
                    masterDataBuildResult,
                  )
                })
                .catch((err) => {
                  console.error('Expression resolution failed:', err)
                  finalizeTracker(trackerForIntents as TrackerResponse, finishedObject.manager, undefined, masterDataBuildResult)
                })
                .finally(() => {
                  setIsResolvingExpressions(false)
                })
              return
            }

            finalizeTracker(trackerForIntents, finishedObject.manager, undefined, masterDataBuildResult)
          })
          .catch(() => {
            finalizeTracker(tracker, finishedObject.manager)
          })
      } else {
        // When stream ends with no valid object (e.g. truncated at 8K), use partial if available
        const partial = lastObjectRef.current
        let partialTracker = buildTrackerFromResponse(partial)
        if (partialTracker) {
          partialTracker = autoFixBindings(partialTracker as TrackerLike) as TrackerResponse
        }
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
          const cid = conversationIdRef.current
          if (cid) {
            persistMessage(cid, {
              role: 'ASSISTANT',
              content: '',
              trackerSchemaSnapshot: partialTracker ?? undefined,
              managerData: sanitizeManagerData(partial.manager),
            }).catch((err) => console.error('Failed to persist assistant message:', err))
          }
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
          const cid = conversationIdRef.current
          if (cid) {
            persistMessage(cid, { role: 'ASSISTANT', content: noResponseMessage }).catch((err) =>
              console.error('Failed to persist assistant message:', err)
            )
          }
        }
      }
    },
    onError: (err: Error) => {
      const partial = lastObjectRef.current
      let partialTracker = buildTrackerFromResponse(partial)
      if (partialTracker) {
        partialTracker = autoFixBindings(partialTracker as TrackerLike) as TrackerResponse
      }
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
        const cid = conversationIdRef.current
        if (cid) {
          persistMessage(cid, {
            role: 'ASSISTANT',
            content: '',
            trackerSchemaSnapshot: partialTracker ?? undefined,
            managerData: sanitizeManagerData(partial.manager),
          }).catch((e) => console.error('Failed to persist assistant message:', e))
        }
        setPendingContinue(true)
        continueCountRef.current = 0
      } else {
        setGenerationErrorMessage(err.message || 'An unknown error occurred')
        const errorContent = `Sorry, I encountered an error: ${err.message || 'An unknown error occurred'}. Please try again.`
        const errorMessageObj: Message = {
          role: 'assistant',
          content: errorContent,
        }
        setMessages((prev) => [...prev, errorMessageObj])
        const cid = conversationIdRef.current
        if (cid) {
          persistMessage(cid, { role: 'ASSISTANT', content: errorContent }).catch((e) =>
            console.error('Failed to persist assistant message:', e)
          )
        }
      }
      console.error('Error generating tracker:', err)
    },
  })

  submitRef.current = submit

  useEffect(() => {
    lastObjectRef.current = object as MultiAgentSchema | undefined
  }, [object])

  /** Resolved tracker for streaming UI: full tracker or base + trackerPatch. Use this so 2nd+ requests show streaming when LLM returns a patch. */
  const streamedDisplayTracker = useMemo(() => {
    const built = buildTrackerFromResponse(object as MultiAgentSchema | undefined)
    return built ? (autoFixBindings(built as TrackerLike) as TrackerResponse) : built
  }, [object, buildTrackerFromResponse])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, object])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    continueCountRef.current = 0
    validationFixRetryCountRef.current = 0
    const userMessage = input.trim()
    setInput('')

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    }

    setMessages((prev) => [...prev, newUserMessage])

    let cid = onConversationCreate ? null : conversationIdRef.current
    let alreadyPersisted = false
    let skipPersist = false
    if (trackerId && onConversationCreate) {
      try {
        const result = await onConversationCreate(userMessage)
        if (result) {
          setConversationId(result.id)
          conversationIdRef.current = result.id
          cid = result.id
          alreadyPersisted = true
        } else {
          skipPersist = true
        }
      } catch (err) {
        console.error('Failed to create conversation via callback:', err)
        skipPersist = true
      }
    }
    if (trackerId && !cid && !onConversationCreate) {
      try {
        cid = await ensureConversation(trackerId)
        setConversationId(cid)
        conversationIdRef.current = cid
      } catch (err) {
        console.error('Failed to create conversation:', err)
      }
    }
    if (cid && !alreadyPersisted && !skipPersist) {
      try {
        await persistMessage(cid, { role: 'USER', content: userMessage })
      } catch (err) {
        console.error('Failed to persist user message:', err)
      }
    }

    const dirty = getDirtyForApi()
    submit({
      query: userMessage,
      messages: messages,
      currentTracker: dirty
        ? (getCurrentTrackerForApi() ?? (INITIAL_TRACKER_SCHEMA as TrackerResponse))
        : {},
      dirty,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
    })
  }

  const handleContinue = () => {
    setGenerationErrorMessage(null)
    const continueMessage: Message = { role: 'user', content: CONTINUE_PROMPT }
    const nextMessages = [...messages, continueMessage]
    setMessages(nextMessages)
    const cid = conversationIdRef.current
    if (cid) {
      persistMessage(cid, { role: 'USER', content: CONTINUE_PROMPT }).catch((e) =>
        console.error('Failed to persist user message:', e)
      )
    }
    const dirtyContinue = getDirtyForApi()
    submit({
      query: CONTINUE_PROMPT,
      messages: nextMessages,
      currentTracker: dirtyContinue
      ? (getCurrentTrackerForApi() ?? (INITIAL_TRACKER_SCHEMA as TrackerResponse))
      : {},
      dirty: dirtyContinue,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
    })
    continueCountRef.current = 0
  }

  useEffect(() => {
    if (!pendingContinue || isLoading || continueCountRef.current >= MAX_AUTO_CONTINUES) return

    setResumingAfterError(false)
    const continueMessage: Message = { role: 'user', content: CONTINUE_PROMPT }
    const nextMessages = [...messages, continueMessage]
    setMessages(nextMessages)
    const cid = conversationIdRef.current
    if (cid) {
      persistMessage(cid, { role: 'USER', content: CONTINUE_PROMPT }).catch((e) =>
        console.error('Failed to persist user message:', e)
      )
    }
    const dirtyPending = getDirtyForApi()
    submit({
      query: CONTINUE_PROMPT,
      messages: nextMessages,
      currentTracker: dirtyPending
      ? (getCurrentTrackerForApi() ?? (INITIAL_TRACKER_SCHEMA as TrackerResponse))
      : {},
      dirty: dirtyPending,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
    })
    setPendingContinue(false)
    continueCountRef.current += 1
  }, [pendingContinue, isLoading, messages, submit, getCurrentTrackerForApi, getDirtyForApi])

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

  const setMessageToolsOpen = (idx: number, open: boolean) => {
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, isToolsOpen: open } : m)))
  }

  const setMessageMasterDataFunctionsOpen = (idx: number, open: boolean) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isMasterDataFunctionsOpen: open } : m)),
    )
  }

  const setMessageMasterDataCreatedOpen = (idx: number, open: boolean) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isMasterDataCreatedOpen: open } : m)),
    )
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
    setMessageToolsOpen,
    setMessageMasterDataFunctionsOpen,
    setMessageMasterDataCreatedOpen,
    isLoading,
    error,
    object,
    streamedDisplayTracker,
    isDialogOpen,
    setIsDialogOpen,
    activeTrackerData,
    setActiveTrackerData,
    isResolvingMasterData,
    generationErrorMessage,
    validationErrors,
    resumingAfterError,
    trackerDataRef,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
    clearDialogError,
    toolCalls,
    isResolvingExpressions,
  }
}
