'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { analystSchema, type AnalystSchema } from '@/lib/schemas/analyst'
import { ensureConversation, persistMessage } from './conversation'
import type { Message } from './useTrackerChat'
import type { TrackerResponse } from './useTrackerChat'

export interface UseAnalystChatOptions {
  trackerId?: string | null
  conversationId?: string | null
  initialMessages?: Message[]
  trackerSchema?: TrackerResponse | null
  trackerDataRef?: React.RefObject<
    (() => Record<string, Array<Record<string, unknown>>>) | null
  >
  /** When provided and conversationId is unset (draft tab), called on first submit to create conversation and persist message; hook skips persist. */
  onConversationCreate?: (userMessage: string) => Promise<{ id: string; title: string } | null>
}

export function useAnalystChat(options: UseAnalystChatOptions = {}) {
  const {
    trackerId,
    conversationId: conversationIdProp,
    initialMessages,
    trackerSchema,
    trackerDataRef,
    onConversationCreate,
  } = options

  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => initialMessages ?? [])
  const [conversationId, setConversationId] = useState<string | null>(
    conversationIdProp ?? null,
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>([])
  const conversationIdRef = useRef<string | null>(conversationIdProp ?? null)

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

  const hasHydratedRef = useRef(false)
  useEffect(() => {
    if (hasHydratedRef.current || !initialMessages?.length) return
    hasHydratedRef.current = true
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const { object, submit, isLoading, error } = useObject({
    api: '/api/agent/generate-analysis',
    schema: analystSchema,
    onFinish: ({ object: finishedObject }: { object?: AnalystSchema }) => {
      if (finishedObject?.content) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: finishedObject.content,
        }
        setMessages((prev) => [...prev, assistantMessage])

        const cid = conversationIdRef.current
        if (cid) {
          persistMessage(cid, {
            role: 'ASSISTANT',
            content: finishedObject.content,
          }).catch((err) => console.error('Failed to persist analyst message:', err))
        }
      } else {
        const errorContent =
          'The analyst did not return a valid response. Please try again or rephrase your request.'
        const errorMessage: Message = { role: 'assistant', content: errorContent }
        setMessages((prev) => [...prev, errorMessage])

        const cid = conversationIdRef.current
        if (cid) {
          persistMessage(cid, { role: 'ASSISTANT', content: errorContent }).catch((err) =>
            console.error('Failed to persist analyst message:', err),
          )
        }
      }
    },
    onError: (err: Error) => {
      const errorContent = `Sorry, I encountered an error: ${err.message || 'An unknown error occurred'}. Please try again.`
      const errorMessage: Message = { role: 'assistant', content: errorContent }
      setMessages((prev) => [...prev, errorMessage])

      const cid = conversationIdRef.current
      if (cid) {
        persistMessage(cid, { role: 'ASSISTANT', content: errorContent }).catch((e) =>
          console.error('Failed to persist analyst message:', e),
        )
      }
      console.error('Error generating analysis:', err)
    },
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, object])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    const newUserMessage: Message = { role: 'user', content: userMessage }
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
        console.error('Failed to create analyst conversation via callback:', err)
        skipPersist = true
      }
    }
    if (trackerId && !cid && !onConversationCreate) {
      try {
        cid = await ensureConversation(trackerId, 'ANALYST')
        setConversationId(cid)
        conversationIdRef.current = cid
      } catch (err) {
        console.error('Failed to create analyst conversation:', err)
      }
    }
    if (cid && !alreadyPersisted && !skipPersist) {
      try {
        await persistMessage(cid, { role: 'USER', content: userMessage })
      } catch (err) {
        console.error('Failed to persist user message:', err)
      }
    }

    const currentData = trackerDataRef?.current?.() ?? {}

    submit({
      query: userMessage,
      messages: messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content ?? '',
      })),
      trackerSchema: trackerSchema ?? null,
      trackerData: currentData,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
    })
  }, [input, isLoading, trackerId, trackerSchema, trackerDataRef, submit, onConversationCreate])

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
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isThinkingOpen: open } : m)),
    )
  }

  const setMessageToolsOpen = (idx: number, open: boolean) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isToolsOpen: open } : m)),
    )
  }

  const isChatEmpty = messages.length === 0 && !isLoading

  return {
    input,
    setInput,
    isFocused,
    setIsFocused,
    messages,
    setMessages,
    handleSubmit,
    applySuggestion,
    setMessageThinkingOpen,
    setMessageToolsOpen,
    isLoading,
    error,
    object,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
  }
}
