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
}

export function useAnalystChat(options: UseAnalystChatOptions = {}) {
  const {
    trackerId,
    conversationId: initialConversationId,
    initialMessages,
    trackerSchema,
    trackerDataRef,
  } = options

  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => initialMessages ?? [])
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>([])
  const conversationIdRef = useRef<string | null>(initialConversationId ?? null)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])
  useEffect(() => {
    if (initialConversationId) setConversationId(initialConversationId)
  }, [initialConversationId])

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
    api: '/api/generate-analysis',
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

    let cid = conversationIdRef.current
    if (trackerId && !cid) {
      try {
        cid = await ensureConversation(trackerId, 'ANALYST')
        setConversationId(cid)
        conversationIdRef.current = cid
      } catch (err) {
        console.error('Failed to create analyst conversation:', err)
      }
    }
    if (cid) {
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
    })
  }, [input, isLoading, trackerId, trackerSchema, trackerDataRef, submit])

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
    isLoading,
    error,
    object,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
  }
}
