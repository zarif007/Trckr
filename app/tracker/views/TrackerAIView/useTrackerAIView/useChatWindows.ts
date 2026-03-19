'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  createConversation,
  getConversation,
  listConversations,
  persistMessage,
} from '../../../hooks/conversation'
import { conversationDisplayTitle, firstWords } from '../../../utils/titleFromMessage'
import type { Message } from '../../../hooks/useTrackerChat'
import type { TrackerResponse } from '../../../hooks/useTrackerChat'
import type { ChatWindow } from '../types'

export interface BuilderMessagesRef {
  current: { messages: Message[]; setMessages: (m: Message[] | ((prev: Message[]) => Message[])) => void }
}

export interface AnalystMessagesRef {
  current: { messages: Message[]; setMessages: (m: Message[]) => void }
}

export function useChatWindows(
  trackerId: string | null | undefined,
  isDataPage: boolean,
  initialConversationId: string | null | undefined,
  builderMessagesRef: React.MutableRefObject<{ messages: Message[]; setMessages: (m: Message[] | ((prev: Message[]) => Message[])) => void }>,
  analystMessagesRef: React.MutableRefObject<{ messages: Message[]; setMessages: (m: Message[]) => void }>
) {
  const [builderChatWindows, setBuilderChatWindows] = useState<ChatWindow[]>(() =>
    trackerId && initialConversationId && !isDataPage
      ? [{ id: initialConversationId, title: 'New chat' }]
      : [{ id: 'builder-1', title: 'New chat' }]
  )
  const [activeBuilderWindowId, setActiveBuilderWindowId] = useState<string>(() =>
    trackerId && initialConversationId && !isDataPage ? initialConversationId : 'builder-1'
  )
  const [builderConversationLoading, setBuilderConversationLoading] = useState(false)
  const [analystChatWindows, setAnalystChatWindows] = useState<ChatWindow[]>(() =>
    trackerId && initialConversationId && isDataPage
      ? [{ id: initialConversationId, title: 'New chat' }]
      : [{ id: 'analyst-1', title: 'New chat' }]
  )
  const [activeAnalystWindowId, setActiveAnalystWindowId] = useState<string>(() =>
    trackerId && initialConversationId && isDataPage ? initialConversationId : 'analyst-1'
  )
  const [analystConversationLoading, setAnalystConversationLoading] = useState(false)
  const builderWindowStateRef = useRef<Record<string, { messages: Message[] }>>({})
  const analystWindowStateRef = useRef<Record<string, { messages: Message[] }>>({})
  const builderFetchTokenRef = useRef(0)
  const analystFetchTokenRef = useRef(0)

  const onBuilderConversationCreate = useCallback(
    async (userMessage: string): Promise<{ id: string; title: string } | null> => {
      if (!trackerId || !activeBuilderWindowId?.startsWith('draft-')) return null
      const title = firstWords(userMessage, 5)
      try {
        const created = await createConversation(trackerId, 'BUILDER', title)
        await persistMessage(created.id, { role: 'USER', content: userMessage })
        const draftId = activeBuilderWindowId
        setBuilderChatWindows((prev) =>
          prev.map((w) =>
            w.id === draftId ? { id: created.id, title } : w
          )
        )
        setActiveBuilderWindowId(created.id)
        builderWindowStateRef.current[created.id] =
          builderWindowStateRef.current[draftId] ?? { messages: [] }
        return { id: created.id, title: created.title ?? title }
      } catch {
        return null
      }
    },
    [trackerId, activeBuilderWindowId]
  )

  const onAnalystConversationCreate = useCallback(
    async (userMessage: string): Promise<{ id: string; title: string } | null> => {
      if (!trackerId || !activeAnalystWindowId?.startsWith('draft-')) return null
      const title = firstWords(userMessage, 5)
      try {
        const created = await createConversation(trackerId, 'ANALYST', title)
        await persistMessage(created.id, { role: 'USER', content: userMessage })
        const draftId = activeAnalystWindowId
        setAnalystChatWindows((prev) =>
          prev.map((w) =>
            w.id === draftId ? { id: created.id, title } : w
          )
        )
        setActiveAnalystWindowId(created.id)
        analystWindowStateRef.current[created.id] =
          analystWindowStateRef.current[draftId] ?? { messages: [] }
        return { id: created.id, title: created.title ?? title }
      } catch {
        return null
      }
    },
    [trackerId, activeAnalystWindowId]
  )

  useEffect(() => {
    if (!trackerId || isDataPage) return
    const trackerIdStr = trackerId
    let cancelled = false
    async function load() {
      try {
        const list = await listConversations(trackerIdStr, 'BUILDER')
        if (cancelled) return
        if (list.length === 0) {
          const created = await createConversation(trackerIdStr, 'BUILDER')
          if (cancelled) return
          setBuilderChatWindows([
            { id: created.id, title: conversationDisplayTitle(created.title) },
          ])
          setActiveBuilderWindowId(created.id)
        } else {
          setBuilderChatWindows(
            list.map((c) => ({ id: c.id, title: conversationDisplayTitle(c.title) }))
          )
          const hasInitial = initialConversationId && list.some((c) => c.id === initialConversationId)
          if (hasInitial && initialConversationId) setActiveBuilderWindowId(initialConversationId)
          else setActiveBuilderWindowId((prev) => (list.some((c) => c.id === prev) ? prev : list[0].id))
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [trackerId, isDataPage, initialConversationId])

  useEffect(() => {
    if (!trackerId || !isDataPage) return
    const trackerIdStr = trackerId
    let cancelled = false
    async function load() {
      try {
        const list = await listConversations(trackerIdStr, 'ANALYST')
        if (cancelled) return
        if (list.length === 0) {
          const created = await createConversation(trackerIdStr, 'ANALYST')
          if (cancelled) return
          setAnalystChatWindows([
            { id: created.id, title: conversationDisplayTitle(created.title) },
          ])
          setActiveAnalystWindowId(created.id)
        } else {
          setAnalystChatWindows(
            list.map((c) => ({ id: c.id, title: conversationDisplayTitle(c.title) }))
          )
          const hasInitial = initialConversationId && list.some((c) => c.id === initialConversationId)
          if (hasInitial && initialConversationId) setActiveAnalystWindowId(initialConversationId)
          else setActiveAnalystWindowId((prev) => (list.some((c) => c.id === prev) ? prev : list[0].id))
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [trackerId, isDataPage, initialConversationId])

  const handleBuilderWindowSelect = useCallback(
    async (id: string) => {
      const fetchToken = ++builderFetchTokenRef.current
      const { messages, setMessages } = builderMessagesRef.current
      if (activeBuilderWindowId) {
        builderWindowStateRef.current = {
          ...builderWindowStateRef.current,
          [activeBuilderWindowId]: {
            ...(builderWindowStateRef.current[activeBuilderWindowId] ?? {}),
            messages,
          },
        }
      }
      setActiveBuilderWindowId(id)
      const cached = builderWindowStateRef.current[id]
      if (cached) {
        setBuilderConversationLoading(false)
        setMessages(cached.messages)
        return
      }
      setBuilderConversationLoading(true)
      setMessages([])
      if (id.startsWith('draft-')) {
        setBuilderConversationLoading(false)
        setMessages([])
        return
      }
      if (trackerId) {
        try {
          const data = await getConversation(trackerId, id, 'BUILDER')
          if (data?.messages) {
            const msgs: Message[] = data.messages.map((m) => ({
              role: m.role,
              content: m.content,
              trackerData: m.trackerData as TrackerResponse | undefined,
              managerData: m.managerData as Message['managerData'],
            }))
            builderWindowStateRef.current[id] = { messages: msgs }
            if (builderFetchTokenRef.current !== fetchToken) return
            setMessages(msgs)
            setBuilderConversationLoading(false)
            return
          }
        } catch {
          // ignore
        }
      }
      if (builderFetchTokenRef.current !== fetchToken) return
      setBuilderConversationLoading(false)
      setMessages([])
    },
    [trackerId, activeBuilderWindowId, builderMessagesRef]
  )

  const handleBuilderWindowCreate = useCallback(() => {
    if (trackerId) {
      const draftId = `draft-builder-${Date.now()}`
      setBuilderChatWindows((prev) => [...prev, { id: draftId, title: 'New chat' }])
      builderWindowStateRef.current[draftId] = { messages: [] }
      setBuilderConversationLoading(false)
      setActiveBuilderWindowId(draftId)
      builderMessagesRef.current.setMessages([])
    } else {
      setBuilderChatWindows((prev) => {
        const index = prev.length + 1
        const id = `builder-${index}`
        builderWindowStateRef.current[id] = { messages: [] }
        setBuilderConversationLoading(false)
        setActiveBuilderWindowId(id)
        builderMessagesRef.current.setMessages([])
        return [...prev, { id, title: 'New chat' }]
      })
    }
  }, [builderMessagesRef, trackerId])

  const handleAnalystWindowSelect = useCallback(
    async (id: string) => {
      const fetchToken = ++analystFetchTokenRef.current
      const { messages } = analystMessagesRef.current
      if (activeAnalystWindowId) {
        analystWindowStateRef.current = {
          ...analystWindowStateRef.current,
          [activeAnalystWindowId]: {
            ...(analystWindowStateRef.current[activeAnalystWindowId] ?? {}),
            messages,
          },
        }
      }
      setActiveAnalystWindowId(id)
      const cached = analystWindowStateRef.current[id]
      if (cached) {
        setAnalystConversationLoading(false)
        analystMessagesRef.current.setMessages(cached.messages)
        return
      }
      setAnalystConversationLoading(true)
      analystMessagesRef.current.setMessages([])
      if (id.startsWith('draft-')) {
        setAnalystConversationLoading(false)
        analystMessagesRef.current.setMessages([])
        return
      }
      if (trackerId) {
        try {
          const data = await getConversation(trackerId, id, 'ANALYST')
          if (data?.messages) {
            const msgs: Message[] = data.messages.map((m) => ({
              role: m.role,
              content: m.content,
            }))
            analystWindowStateRef.current[id] = { messages: msgs }
            if (analystFetchTokenRef.current !== fetchToken) return
            analystMessagesRef.current.setMessages(msgs)
            setAnalystConversationLoading(false)
            return
          }
        } catch {
          // ignore
        }
      }
      if (analystFetchTokenRef.current !== fetchToken) return
      setAnalystConversationLoading(false)
      analystMessagesRef.current.setMessages([])
    },
    [trackerId, activeAnalystWindowId, analystMessagesRef]
  )

  const handleAnalystWindowCreate = useCallback(() => {
    if (trackerId) {
      const draftId = `draft-analyst-${Date.now()}`
      setAnalystChatWindows((prev) => [...prev, { id: draftId, title: 'New chat' }])
      analystWindowStateRef.current[draftId] = { messages: [] }
      setAnalystConversationLoading(false)
      setActiveAnalystWindowId(draftId)
      analystMessagesRef.current.setMessages([])
    } else {
      setAnalystChatWindows((prev) => {
        const index = prev.length + 1
        const id = `analyst-${index}`
        analystWindowStateRef.current[id] = { messages: [] }
        setAnalystConversationLoading(false)
        setActiveAnalystWindowId(id)
        analystMessagesRef.current.setMessages([])
        return [...prev, { id, title: 'New chat' }]
      })
    }
  }, [analystMessagesRef, trackerId])

  const updateBuilderTitleFromInput = useCallback(
    (text: string) => {
      const title = firstWords(text, 5)
      if (!title || title === 'New chat') return
      setBuilderChatWindows((prev) =>
        prev.map((w) =>
          w.id === activeBuilderWindowId && w.title === 'New chat'
            ? { ...w, title }
            : w
        )
      )
    },
    [activeBuilderWindowId]
  )

  const updateAnalystTitleFromInput = useCallback(
    (text: string) => {
      const title = firstWords(text, 5)
      if (!title || title === 'New chat') return
      setAnalystChatWindows((prev) =>
        prev.map((w) =>
          w.id === activeAnalystWindowId && w.title === 'New chat'
            ? { ...w, title }
            : w
        )
      )
    },
    [activeAnalystWindowId]
  )

  return {
    builderChatWindows,
    activeBuilderWindowId,
    builderConversationLoading,
    analystChatWindows,
    activeAnalystWindowId,
    analystConversationLoading,
    builderWindowStateRef,
    analystWindowStateRef,
    onBuilderConversationCreate,
    onAnalystConversationCreate,
    handleBuilderWindowSelect,
    handleBuilderWindowCreate,
    handleAnalystWindowSelect,
    handleAnalystWindowCreate,
    updateBuilderTitleFromInput,
    updateAnalystTitleFromInput,
  }
}
