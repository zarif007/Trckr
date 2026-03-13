'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShareTrackerDialog } from '@/app/components/teams'
import {
  useUndoableSchemaChange,
} from '@/app/components/tracker-display/edit-mode'
import {
  DEFAULT_FORM_ACTION,
  INITIAL_TRACKER_SCHEMA,
} from '@/app/components/tracker-display/tracker-editor'
import { useTrackerNav } from '../TrackerNavContext'
import { useTrackerChat, type Message, type TrackerResponse } from '../hooks/useTrackerChat'
import { useAnalystChat } from '../hooks/useAnalystChat'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { TrackerPanel, type GridDataSnapshot } from './TrackerPanel'
import { TrackerChatPanel } from './TrackerChatPanel'
import type { BranchRecord } from '@/app/components/tracker-page/TrackerBranchPanel'
import { useAutoSaveTrackerData } from '../hooks/useAutoSaveTrackerData'
import type { TrackerFormAction } from '@/app/components/tracker-display/types'
import { useAutoSave } from '@/app/hooks/useAutoSave'

const MIN_LEFT_PX = 320
const MIN_RIGHT_PX = 360
const DRAFT_STATUS_TAG = 'Draft'

function normalizeFormActions(actions: TrackerFormAction[] | null | undefined): TrackerFormAction[] {
  const list = Array.isArray(actions) ? actions : []
  const trimmed = list.map((action, index) => {
    const label = typeof action?.label === 'string' ? action.label.trim() : ''
    const statusTag = typeof action?.statusTag === 'string' ? action.statusTag.trim() : ''
    return {
      id:
        typeof action?.id === 'string' && action.id.trim().length > 0
          ? action.id
          : `form_action_${index}`,
      label,
      statusTag,
      isEditable: action?.isEditable === true,
    }
  })
  const firstFromInput = trimmed[0]
  const first: TrackerFormAction = {
    id: firstFromInput?.id || DEFAULT_FORM_ACTION.id,
    label: firstFromInput?.label || DEFAULT_FORM_ACTION.label,
    statusTag: firstFromInput?.statusTag || DEFAULT_FORM_ACTION.statusTag,
    isEditable: true,
  }
  const rest = trimmed
    .slice(1)
    .filter((action) => action.label.length > 0 && action.statusTag.length > 0)
  return [first, ...rest]
}

function normalizeTrackerSchema(next: TrackerResponse): TrackerResponse {
  return {
    ...next,
    formActions: normalizeFormActions(next.formActions),
  }
}

export interface TrackerEditorViewProps {
  initialSchema?: TrackerResponse
  initialGridData?: GridDataSnapshot | null
  onSaveTracker?: (schema: TrackerResponse) => Promise<void>
  initialEditMode?: boolean
  initialChatOpen?: boolean
  trackerId?: string | null
  /** Tracker instance type (SINGLE or MULTI). */
  instanceType?: 'SINGLE' | 'MULTI'
  /** Current tracker instance id (MULTI only). */
  instanceId?: string | null
  /** Auto-save enabled for eligible trackers. */
  autoSave?: boolean
  /** Initial form status tag (if available). */
  initialFormStatus?: string | null
  initialConversationId?: string | null
  initialMessages?: Message[]
  /** Whether this tracker has version control enabled */
  versionControl?: boolean
  /** Initial branch name from URL (?branch=...) */
  initialBranchName?: string | null
  /** Called when user switches branch so URL can be updated */
  onBranchChange?: (branchName: string) => void
  /** Controls which capabilities are exposed in the page */
  pageMode?: 'full' | 'data' | 'schema'
  /** Optional header navigation button */
  primaryNavAction?: { label: string; href: string } | null
  /** Show debug/share utilities in tracker panel controls */
  showPanelUtilities?: boolean
  /** Enable auto-save for schema (edit view) */
  schemaAutoSave?: boolean
}

export function TrackerAIView(props: TrackerEditorViewProps = {}) {
  const {
    initialSchema,
    initialGridData = null,
    onSaveTracker,
    initialEditMode = true,
    initialChatOpen = true,
    trackerId,
    instanceType = 'SINGLE',
    instanceId = null,
    autoSave = true,
    initialFormStatus = null,
    initialConversationId,
    initialMessages,
    versionControl = false,
    initialBranchName,
    onBranchChange,
    pageMode = 'full',
    primaryNavAction = null,
    showPanelUtilities = true,
    schemaAutoSave = false,
  } = props
  const isDataPage = pageMode === 'data'
  const isSchemaPage = pageMode === 'schema'
  const canEditSchema = !isDataPage
  const allowSaveTracker = !isDataPage
  const allowSaveData = !isSchemaPage
  const {
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
    activeTrackerData,
    setActiveTrackerData,
    generationErrorMessage,
    validationErrors,
    resumingAfterError,
    trackerDataRef,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
    toolCalls,
    isResolvingExpressions,
  } = useTrackerChat({
    initialTracker: initialSchema ?? undefined,
    trackerId: trackerId ?? undefined,
    conversationId: isDataPage ? undefined : (initialConversationId ?? undefined),
    initialMessages: isDataPage ? undefined : initialMessages,
  })

  const analyst = useAnalystChat({
    trackerId: trackerId ?? undefined,
    conversationId: isDataPage ? (initialConversationId ?? undefined) : undefined,
    initialMessages: isDataPage ? initialMessages : undefined,
    trackerSchema: (initialSchema ?? activeTrackerData) as TrackerResponse | null,
    trackerDataRef,
  })

  const isDesktop = useIsDesktop()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftWidth, setLeftWidth] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(initialEditMode && canEditSchema)
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen)
  const [mobileTab, setMobileTab] = useState<'preview' | 'chat'>('preview')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  type ChatWindow = { id: string; title: string }
  const [builderChatWindows, setBuilderChatWindows] = useState<ChatWindow[]>([
    { id: 'builder-1', title: 'Chat 1' },
  ])
  const [activeBuilderWindowId, setActiveBuilderWindowId] = useState<string>('builder-1')
  const [analystChatWindows, setAnalystChatWindows] = useState<ChatWindow[]>([
    { id: 'analyst-1', title: 'Chat 1' },
  ])
  const [activeAnalystWindowId, setActiveAnalystWindowId] = useState<string>('analyst-1')
  const [schema, setSchema] = useState<TrackerResponse>(
    () => normalizeTrackerSchema((initialSchema ?? INITIAL_TRACKER_SCHEMA) as TrackerResponse)
  )
  const [viewingMessageIndex, setViewingMessageIndex] = useState<number | null>(null)
  type LoadedSnapshot = {
    id: string
    label: string | null
    data: GridDataSnapshot
    updatedAt?: string
    formStatus?: string | null
  }
  const [loadedSnapshot, setLoadedSnapshot] = useState<LoadedSnapshot | null>(null)
  const [currentFormStatus, setCurrentFormStatus] = useState<string | null>(initialFormStatus)
  const [formActionSaving, setFormActionSaving] = useState(false)
  const [formActionError, setFormActionError] = useState<string | null>(null)
  const formStatusRef = useRef<string | null>(initialFormStatus)
  const instanceIdRef = useRef<string | null>(instanceId)
  useEffect(() => {
    formStatusRef.current = currentFormStatus
  }, [currentFormStatus])
  useEffect(() => {
    setCurrentFormStatus(initialFormStatus ?? null)
  }, [initialFormStatus])
  useEffect(() => {
    instanceIdRef.current = instanceId
  }, [instanceId])
  const [lastSyncedTracker, setLastSyncedTracker] = useState<TrackerResponse | null>(null)
  useEffect(() => {
    if (!loadedSnapshot) return
    setCurrentFormStatus(loadedSnapshot.formStatus ?? null)
  }, [loadedSnapshot])

  useEffect(() => {
    if (!canEditSchema && editMode) {
      setEditMode(false)
    }
  }, [canEditSchema, editMode])

  // --- Version Control state ---
  const [vcBranches, setVcBranches] = useState<BranchRecord[]>([])
  const [vcCurrentBranch, setVcCurrentBranch] = useState<BranchRecord | null>(null)
  const vcCurrentBranchRef = useRef<BranchRecord | null>(null)
  vcCurrentBranchRef.current = vcCurrentBranch

  // Fetch branches when version control is enabled
  useEffect(() => {
    if (!versionControl || !trackerId) return
    let cancelled = false
    async function fetchBranches() {
      try {
        const res = await fetch(`/api/trackers/${trackerId}/branches`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        const branches: BranchRecord[] = data.branches ?? []
        setVcBranches(branches)
        // Prefer branch from URL, else default to main
        const selected =
          (initialBranchName && branches.find((b) => b.branchName === initialBranchName && !b.isMerged)) ??
          branches.find((b) => b.branchName === 'main' && !b.isMerged)
        if (selected) {
          setVcCurrentBranch(selected)
          if (selected.data && typeof selected.data === 'object') {
            setLoadedSnapshot({
              id: selected.id,
              label: selected.label ?? selected.branchName,
              data: selected.data as GridDataSnapshot,
              updatedAt: selected.updatedAt,
              formStatus: (selected as BranchRecord & { formStatus?: string | null }).formStatus ?? null,
            })
          }
        }
      } catch {
        // ignore
      }
    }
    fetchBranches()
    return () => { cancelled = true }
  }, [versionControl, trackerId, initialBranchName])

  const trackerName = schema?.name ?? schema?.tabs?.[0]?.name ?? 'Untitled tracker'
  const formActions = useMemo<TrackerFormAction[]>(
    () => normalizeFormActions(schema?.formActions),
    [schema]
  )
  const activeFormAction = useMemo(
    () =>
      formActions.find(
        (action) =>
          action.statusTag.trim().toLowerCase() === (currentFormStatus ?? '').trim().toLowerCase()
      ) ?? null,
    [formActions, currentFormStatus]
  )
  const currentStatusNormalized = (currentFormStatus ?? '').trim().toLowerCase()
  const activeActionIndex = useMemo(
    () =>
      formActions.findIndex(
        (action) => action.statusTag.trim().toLowerCase() === currentStatusNormalized
      ),
    [formActions, currentStatusNormalized]
  )
  const nextActionIndex = useMemo(() => {
    if (formActions.length === 0) return -1
    if (activeActionIndex < 0) return 0
    const next = activeActionIndex + 1
    return next < formActions.length ? next : -1
  }, [formActions, activeActionIndex])
  const visibleFormActions = useMemo(
    () => (nextActionIndex >= 0 ? [formActions[nextActionIndex]] : []),
    [formActions, nextActionIndex]
  )
  const effectiveCurrentFormStatus = useMemo(
    () => currentFormStatus?.trim() || DRAFT_STATUS_TAG,
    [currentFormStatus]
  )
  const previousFormStatus = useMemo(() => {
    if (nextActionIndex <= 0) return DRAFT_STATUS_TAG
    return formActions[nextActionIndex - 1]?.statusTag || DRAFT_STATUS_TAG
  }, [formActions, nextActionIndex])
  const isReadOnly = activeFormAction ? !activeFormAction.isEditable : false
  const trackerNavCtx = useTrackerNav()
  const setTrackerNav = trackerNavCtx?.setTrackerNav ?? null
  const setSaveState = trackerNavCtx?.setSaveState ?? null
  const saveDataRef = useRef<() => Promise<void>>(async () => { })
  const setTrackerNavRef = useRef(setTrackerNav)
  setTrackerNavRef.current = setTrackerNav
  const lastSyncedTrackerRef = useRef<TrackerResponse | null>(null)
  const [dataSaveStatus, setDataSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [dataSaveError, setDataSaveError] = useState<string | null>(null)
  const saveStatusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [schemaSaveStatus, setSchemaSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [schemaSaveError, setSchemaSaveError] = useState<string | null>(null)
  const builderWindowStateRef = useRef<Record<string, { messages: Message[] }>>({
    'builder-1': { messages },
  })
  const analystWindowStateRef = useRef<Record<string, { messages: Message[] }>>({
    'analyst-1': { messages: analyst.messages },
  })

  const setSavedWithTimeout = useCallback(() => {
    setDataSaveStatus('saved')
    setDataSaveError(null)
    if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
    saveStatusResetTimerRef.current = setTimeout(() => {
      saveStatusResetTimerRef.current = null
      setDataSaveStatus('idle')
    }, 1500)
  }, [])
  const setFormStatus = useCallback((status: string | null) => {
    formStatusRef.current = status
    setCurrentFormStatus(status)
  }, [])

  const saveTrackerData = useCallback(
    async (options: { formStatus?: string | null; data?: GridDataSnapshot } = {}) => {
      if (!trackerId) return
      const data = options.data ?? (trackerDataRef.current?.() ?? {})
      const nextFormStatus =
        options.formStatus !== undefined ? options.formStatus : formStatusRef.current
      const payload: Record<string, unknown> = { data }
      if (nextFormStatus !== undefined) payload.formStatus = nextFormStatus

      const handleResponse = async (res: Response) => {
        const saved = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg =
            typeof saved?.error === 'string' ? saved.error : `Failed to save (${res.status})`
          throw new Error(msg)
        }
        if (saved?.id && saved?.data) {
          setLoadedSnapshot({
            id: saved.id,
            label: saved.label ?? null,
            data: saved.data as GridDataSnapshot,
            updatedAt: saved.updatedAt,
            formStatus: saved.formStatus ?? null,
          })
        }
        return saved
      }

      if (versionControl) {
        const currentBranch = vcCurrentBranchRef.current
        if (currentBranch) {
          const res = await fetch(`/api/trackers/${trackerId}/branches/${currentBranch.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const updated = await handleResponse(res)
          if (updated?.id) {
            setVcBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
            setVcCurrentBranch(updated)
          }
          return updated
        }
        const res = await fetch(`/api/trackers/${trackerId}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, branchName: 'main', label: 'main' }),
        })
        const created = await handleResponse(res)
        if (created?.id) {
          setVcBranches([created])
          setVcCurrentBranch(created)
        }
        return created
      }

      if (instanceType === 'MULTI') {
        const currentId = instanceIdRef.current
        if (currentId && currentId !== 'new') {
          const res = await fetch(`/api/trackers/${trackerId}/data/${currentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          return handleResponse(res)
        }
        const res = await fetch(`/api/trackers/${trackerId}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const saved = await handleResponse(res)
        if (saved?.id) {
          instanceIdRef.current = saved.id
          router.replace(`/tracker/${trackerId}?instanceId=${saved.id}`, { scroll: false })
        }
        return saved
      }

      const res = await fetch(`/api/trackers/${trackerId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return handleResponse(res)
    },
    [trackerId, trackerDataRef, versionControl, instanceType, router]
  )

  const allowAutoSave =
    autoSave &&
    instanceType === 'SINGLE' &&
    !versionControl &&
    pageMode === 'data' &&
    !isReadOnly

  const allowSchemaAutoSave = schemaAutoSave && pageMode === 'schema' && Boolean(onSaveTracker)

  const { scheduleSave } = useAutoSaveTrackerData({
    enabled: allowAutoSave,
    getData: () => trackerDataRef.current?.() ?? {},
    save: async (data) => {
      await saveTrackerData({ data })
    },
    debounceMs: 2000,
    idleMs: 2000,
    onStateChange: (state, error) => {
      if (state === 'saving') {
        if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
        saveStatusResetTimerRef.current = null
        setDataSaveError(null)
        setDataSaveStatus('saving')
        return
      }
      if (state === 'idle') {
        setSavedWithTimeout()
        return
      }
      if (state === 'error') {
        if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
        saveStatusResetTimerRef.current = null
        setDataSaveStatus('error')
        setDataSaveError(error?.message ?? 'Failed to auto-save')
      }
    },
  })

  const { scheduleSave: scheduleSchemaSave } = useAutoSave<TrackerResponse>({
    enabled: allowSchemaAutoSave,
    getData: () => schemaRef.current,
    save: async (nextSchema) => {
      if (!onSaveTracker) return
      await onSaveTracker(nextSchema)
    },
    debounceMs: 1000,
    idleMs: 1500,
    onStateChange: (state, error) => {
      if (state === 'saving') {
        if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
        saveStatusResetTimerRef.current = null
        setSchemaSaveError(null)
        setSchemaSaveStatus('saving')
        return
      }
      if (state === 'idle') {
        setSchemaSaveStatus('saved')
        setSchemaSaveError(null)
        if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
        saveStatusResetTimerRef.current = setTimeout(() => {
          saveStatusResetTimerRef.current = null
          setSchemaSaveStatus('idle')
        }, 1500)
        return
      }
      if (state === 'error') {
        if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
        saveStatusResetTimerRef.current = null
        setSchemaSaveStatus('error')
        setSchemaSaveError(error?.message ?? 'Failed to auto-save tracker')
      }
    },
  })

  const handleGridDataChange = useCallback(() => {
    if (!allowAutoSave) return
    const isDraft = (formStatusRef.current ?? '').trim().toLowerCase() === DRAFT_STATUS_TAG.toLowerCase()
    if (!isDraft) {
      setFormStatus(DRAFT_STATUS_TAG)
    }
    scheduleSave()
  }, [allowAutoSave, scheduleSave, setFormStatus])

  const handleFormActionSelect = useCallback(
    async (action: TrackerFormAction) => {
      if (!trackerId) return
      setFormActionSaving(true)
      setFormActionError(null)
      const prevStatus = formStatusRef.current
      setFormStatus(action.statusTag)
      try {
        await saveTrackerData({ formStatus: action.statusTag })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update status'
        setFormActionError(msg)
        setFormStatus(prevStatus ?? null)
      } finally {
        setFormActionSaving(false)
      }
    },
    [saveTrackerData, setFormStatus, trackerId]
  )

  // --- Multi-window chat state (builder) ---
  useEffect(() => {
    builderWindowStateRef.current = {
      ...builderWindowStateRef.current,
      [activeBuilderWindowId]: {
        ...(builderWindowStateRef.current[activeBuilderWindowId] ?? {}),
        messages,
      },
    }
  }, [messages, activeBuilderWindowId])

  const handleBuilderWindowSelect = useCallback(
    (id: string) => {
      setActiveBuilderWindowId(id)
      const cached = builderWindowStateRef.current[id]
      if (cached) {
        setMessages(cached.messages)
      } else {
        setMessages([])
      }
    },
    [setMessages],
  )

  const handleBuilderWindowCreate = useCallback(() => {
    setBuilderChatWindows((prev) => {
      const index = prev.length + 1
      const id = `builder-${index}`
      builderWindowStateRef.current[id] = { messages: [] }
      setActiveBuilderWindowId(id)
      setMessages([])
      return [...prev, { id, title: `Chat ${index}` }]
    })
  }, [setMessages])

  // --- Multi-window chat state (analyst) ---
  useEffect(() => {
    analystWindowStateRef.current = {
      ...analystWindowStateRef.current,
      [activeAnalystWindowId]: {
        ...(analystWindowStateRef.current[activeAnalystWindowId] ?? {}),
        messages: analyst.messages,
      },
    }
  }, [analyst.messages, activeAnalystWindowId])

  const handleAnalystWindowSelect = useCallback(
    (id: string) => {
      setActiveAnalystWindowId(id)
      const cached = analystWindowStateRef.current[id]
      if (cached) {
        analyst.setMessages(cached.messages)
      } else {
        analyst.setMessages([])
      }
    },
    [analyst],
  )

  const handleAnalystWindowCreate = useCallback(() => {
    setAnalystChatWindows((prev) => {
      const index = prev.length + 1
      const id = `analyst-${index}`
      analystWindowStateRef.current[id] = { messages: [] }
      setActiveAnalystWindowId(id)
      analyst.setMessages([])
      return [...prev, { id, title: `Chat ${index}` }]
    })
  }, [analyst])

  useEffect(() => {
    if (activeTrackerData && viewingMessageIndex === null) {
      if (lastSyncedTrackerRef.current !== activeTrackerData) {
        lastSyncedTrackerRef.current = activeTrackerData
        setLastSyncedTracker(activeTrackerData)
        setSchema(normalizeTrackerSchema(activeTrackerData))
        if (allowSchemaAutoSave) {
          scheduleSchemaSave()
        }
      }
    }
  }, [activeTrackerData, viewingMessageIndex, allowSchemaAutoSave, scheduleSchemaSave])

  const effectiveDisplaySchema = useMemo(() => {
    const isTrackerBusy = isLoading || isResolvingExpressions
    if (isTrackerBusy && streamedDisplayTracker) {
      return streamedDisplayTracker
    }
    if (viewingMessageIndex !== null) {
      return schema
    }
    if (activeTrackerData && lastSyncedTracker !== activeTrackerData) {
      return activeTrackerData
    }
    return schema
  }, [
    isLoading,
    isResolvingExpressions,
    streamedDisplayTracker,
    viewingMessageIndex,
    activeTrackerData,
    schema,
    lastSyncedTracker,
  ])

  const handleSchemaChange = useCallback(
    (next: TrackerResponse) => {
      const normalizedNext = normalizeTrackerSchema(next)
      setSchema(normalizedNext)
      setActiveTrackerData(normalizedNext)
      if (allowSchemaAutoSave) {
        scheduleSchemaSave()
      }
    },
    [setActiveTrackerData, allowSchemaAutoSave, scheduleSchemaSave]
  )

  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  const stableOnTrackerNameChange = useCallback((name: string) => {
    handleSchemaChange({ ...schemaRef.current, name })
  }, [handleSchemaChange])
  const handleFormActionsChange = useCallback(
    (actions: TrackerFormAction[]) => {
      handleSchemaChange({
        ...schemaRef.current,
        formActions: normalizeFormActions(actions),
      })
    },
    [handleSchemaChange]
  )

  useEffect(() => {
    if (!setTrackerNav) return
    setTrackerNav({
      name: trackerName,
      onNameChange: stableOnTrackerNameChange,
    })
  }, [setTrackerNav, trackerName, stableOnTrackerNameChange])

  useEffect(() => {
    return () => setTrackerNavRef.current?.(null)
  }, [])

  const handleSaveTracker = useCallback(async () => {
    if (onSaveTracker) {
      await onSaveTracker(schema)
      return
    }
    const res = await fetch('/api/trackers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new: true,
        name: trackerName,
        schema,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Failed to save tracker')
    }
    const data = (await res.json()) as { id: string }
    router.push(`/tracker/${data.id}/edit?new=true`)
  }, [schema, trackerName, router, onSaveTracker])

  useEffect(() => {
    if (!setSaveState) return
    const showManualSaveData = allowSaveData && !allowAutoSave && !allowSchemaAutoSave
    const exposeManualTrackerSave = allowSaveTracker && !allowSchemaAutoSave
    const autosaveEnabledForNav = allowAutoSave || allowSchemaAutoSave
    const navDataSaveStatus = allowAutoSave
      ? dataSaveStatus
      : allowSchemaAutoSave
        ? schemaSaveStatus
        : 'idle'
    const navDataSaveError = allowAutoSave
      ? dataSaveError
      : allowSchemaAutoSave
        ? schemaSaveError
        : null
    setSaveState({
      onSaveTracker: exposeManualTrackerSave ? handleSaveTracker : null,
      onSaveData: showManualSaveData ? () => saveDataRef.current() : null,
      isAgentBuilding: isLoading,
      primaryNavAction,
      autosaveEnabled: autosaveEnabledForNav,
      dataSaveStatus: navDataSaveStatus,
      dataSaveError: navDataSaveError,
      formActions: isDataPage || (canEditSchema && editMode) ? formActions : [],
      currentFormStatus: isDataPage ? effectiveCurrentFormStatus : null,
      previousFormStatus: isDataPage ? previousFormStatus : null,
      visibleFormActions: isDataPage ? visibleFormActions : [],
      formActionSaving: isDataPage ? formActionSaving : false,
      formActionError: isDataPage ? formActionError : null,
      canConfigureFormActions: canEditSchema && editMode,
      onFormActionsChange: canEditSchema && editMode ? handleFormActionsChange : null,
      onFormActionSelect: isDataPage ? handleFormActionSelect : null,
    })
  }, [
    setSaveState,
    handleSaveTracker,
    isLoading,
    allowSaveTracker,
    allowSaveData,
    allowAutoSave,
    allowSchemaAutoSave,
    primaryNavAction,
    dataSaveStatus,
    dataSaveError,
    schemaSaveStatus,
    schemaSaveError,
    formActions,
    effectiveCurrentFormStatus,
    previousFormStatus,
    visibleFormActions,
    formActionSaving,
    formActionError,
    canEditSchema,
    editMode,
    handleFormActionsChange,
    isDataPage,
    handleFormActionSelect,
  ])

  useEffect(() => {
    if (!setSaveState) return
    return () =>
      setSaveState({
        onSaveTracker: null,
        onSaveData: null,
        isAgentBuilding: false,
        primaryNavAction: null,
        autosaveEnabled: false,
        dataSaveStatus: 'idle',
        dataSaveError: null,
        formActions: [],
        currentFormStatus: null,
        previousFormStatus: null,
        visibleFormActions: [],
        formActionSaving: false,
        formActionError: null,
        canConfigureFormActions: false,
        onFormActionsChange: null,
        onFormActionSelect: null,
      })
  }, [setSaveState])

  const undoable = useUndoableSchemaChange(schema, handleSchemaChange)

  const handleViewHistoricalTracker = useCallback((trackerData: TrackerResponse, messageIndex: number) => {
    setSchema(normalizeTrackerSchema(trackerData))
    setViewingMessageIndex(messageIndex)
    setEditMode(false)
    setMobileTab('preview')
  }, [])

  const handleReturnToLatest = useCallback(() => {
    setViewingMessageIndex(null)
    if (activeTrackerData) {
      setLastSyncedTracker(activeTrackerData)
      setSchema(normalizeTrackerSchema(activeTrackerData))
    }
  }, [activeTrackerData])

  // --- Version Control callbacks ---
  const handleVcBranchSwitch = useCallback(
    (branch: BranchRecord) => {
      setVcCurrentBranch(branch)
      if (branch.data && typeof branch.data === 'object') {
        const snapshot: LoadedSnapshot = {
          id: branch.id,
          label: branch.label ?? branch.branchName,
          data: branch.data as GridDataSnapshot,
          updatedAt: branch.updatedAt,
          formStatus: (branch as BranchRecord & { formStatus?: string | null }).formStatus ?? null,
        }
        setLoadedSnapshot(snapshot)
      }
      onBranchChange?.(branch.branchName)
    },
    [onBranchChange]
  )

  const handleVcBranchCreated = useCallback((branch: BranchRecord) => {
    setVcBranches((prev) => [branch, ...prev])
    handleVcBranchSwitch(branch)
  }, [handleVcBranchSwitch])

  const handleVcMergedToMain = useCallback((updatedMain: BranchRecord) => {
    setVcBranches((prev) => prev.map((b) => {
      if (b.branchName === 'main' && !b.isMerged) return updatedMain
      if (b.id === vcCurrentBranchRef.current?.id) return { ...b, isMerged: true }
      return b
    }))
    handleVcBranchSwitch(updatedMain)
  }, [handleVcBranchSwitch])

  useEffect(() => {
    saveDataRef.current = () => {
      return saveTrackerData().then(() => undefined)
    }
  }, [saveTrackerData])

  useEffect(() => {
    return () => {
      if (saveStatusResetTimerRef.current) clearTimeout(saveStatusResetTimerRef.current)
    }
  }, [])

  const handleShareClick = useCallback(() => setShareDialogOpen(true), [])

  const handleSubmitWithReset = useCallback(() => {
    setViewingMessageIndex(null)
    handleSubmit()
  }, [handleSubmit])

  useEffect(() => {
    if (isDesktop && mobileTab === 'chat') {
      setIsChatOpen(true)
    }
  }, [isDesktop, mobileTab])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isChatOpen || !isDesktop) return

    const clampWidth = () => {
      const rect = container.getBoundingClientRect()
      const fallback = Math.round(rect.width * 0.75)
      setLeftWidth((prev) => {
        const current = prev ?? fallback
        const maxLeft = Math.max(MIN_LEFT_PX, rect.width - MIN_RIGHT_PX)
        return Math.max(MIN_LEFT_PX, Math.min(current, maxLeft))
      })
    }

    clampWidth()
    window.addEventListener('resize', clampWidth)
    return () => window.removeEventListener('resize', clampWidth)
  }, [isChatOpen, isDesktop])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const maxLeft = Math.max(MIN_LEFT_PX, rect.width - MIN_RIGHT_PX)

    const handleMove = (moveEvent: PointerEvent) => {
      const next = moveEvent.clientX - rect.left
      const clamped = Math.max(MIN_LEFT_PX, Math.min(next, maxLeft))
      setLeftWidth(clamped)
    }

    const handleUp = () => {
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [])

  const hasGeneratedTracker = useMemo(
    () => messages.some((message) => Boolean(message.trackerData)),
    [messages]
  )

  const lastTrackerMessageIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].trackerData) {
        return i
      }
    }
    return null
  }, [messages])

  const isViewingHistoricalVersion = useMemo(() => {
    if (viewingMessageIndex === null) return false
    if (lastTrackerMessageIndex === null) return false
    return viewingMessageIndex !== lastTrackerMessageIndex
  }, [viewingMessageIndex, lastTrackerMessageIndex])

  const isStreamingTracker = Boolean(isLoading && streamedDisplayTracker)
  const hasAnyAssistantResponse = messages.some((m) => m.role === 'assistant')

  const showStatusPanel =
    Boolean(error) ||
    Boolean(generationErrorMessage) ||
    validationErrors.length > 0 ||
    (!isLoading && messages.length > 0 && !hasGeneratedTracker && hasAnyAssistantResponse)

  useEffect(() => {
    if (isLoading || isResolvingExpressions) {
      setEditMode(false)
    }
  }, [isLoading, isResolvingExpressions])

  const chatStatusPanelProps = {
    isLoading: isDataPage ? analyst.isLoading : isLoading,
    validationErrors: isDataPage ? [] : validationErrors,
    error: isDataPage ? analyst.error : error,
    generationErrorMessage: isDataPage ? null : generationErrorMessage,
    resumingAfterError: isDataPage ? false : resumingAfterError,
    onContinue: isDataPage ? undefined : handleContinue,
    messagesLength: isDataPage ? analyst.messages.length : messages.length,
    hasGeneratedTracker: isDataPage ? false : hasGeneratedTracker,
    hasAnyAssistantResponse: isDataPage
      ? analyst.messages.some((m) => m.role === 'assistant')
      : hasAnyAssistantResponse,
  }

  const chatPanelProps = isDataPage
    ? {
        showStatusPanel: Boolean(analyst.error),
        statusPanelProps: chatStatusPanelProps,
        input: analyst.input,
        setInput: analyst.setInput,
        isFocused: analyst.isFocused,
        setIsFocused: analyst.setIsFocused,
        handleSubmit: analyst.handleSubmit,
        applySuggestion: analyst.applySuggestion,
        isLoading: analyst.isLoading,
        isChatEmpty: analyst.isChatEmpty,
        textareaRef: analyst.textareaRef,
        messages: analyst.messages,
        setMessageThinkingOpen: analyst.setMessageThinkingOpen,
        messagesEndRef: analyst.messagesEndRef,
        object: analyst.object,
        onViewTracker: undefined,
        activeTrackerMessageIndex: undefined,
        toolCalls: undefined,
        isResolvingExpressions: false,
        mode: 'data' as const,
        conversationWindows: analystChatWindows,
        activeConversationId: activeAnalystWindowId,
        onSelectConversation: handleAnalystWindowSelect,
        onCreateConversation: handleAnalystWindowCreate,
      }
    : {
        showStatusPanel,
        statusPanelProps: chatStatusPanelProps,
        input,
        setInput,
        isFocused,
        setIsFocused,
        handleSubmit: handleSubmitWithReset,
        applySuggestion,
        isLoading,
        isChatEmpty,
        textareaRef,
        messages,
        setMessageThinkingOpen,
        messagesEndRef,
        object,
        onViewTracker: handleViewHistoricalTracker,
        activeTrackerMessageIndex: viewingMessageIndex ?? lastTrackerMessageIndex,
        toolCalls,
        isResolvingExpressions,
        mode: 'schema' as const,
        conversationWindows: builderChatWindows,
        activeConversationId: activeBuilderWindowId,
        onSelectConversation: handleBuilderWindowSelect,
        onCreateConversation: handleBuilderWindowCreate,
      }

  const mobileLayout = (
    <div
      className="h-screen box-border font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden flex flex-col pt-12 md:pt-14 md:hidden"
      aria-hidden={isDesktop}
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as 'preview' | 'chat')}
          className="flex-1 min-h-0 flex flex-col gap-0"
        >
          <div className="shrink-0 px-1 pt-2 pb-2 border-b border-border/60 bg-background/95 backdrop-blur">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <TrackerPanel
              schema={effectiveDisplaySchema}
              editMode={editMode}
              setEditMode={setEditMode}
              allowSchemaEditToggle={canEditSchema}
              isChatOpen={isChatOpen}
              setIsChatOpen={setIsChatOpen}
              isStreamingTracker={isStreamingTracker}
              trackerDataRef={trackerDataRef}
              onGridDataChange={handleGridDataChange}
              handleSchemaChange={canEditSchema && editMode ? undoable.onSchemaChange : undefined}
              undo={canEditSchema && editMode ? undoable.undo : undefined}
              canUndo={canEditSchema && editMode ? undoable.canUndo : false}
              leftWidth={leftWidth}
              fullWidth
              hideChatToggle
              onShareClick={handleShareClick}
              trackerName={trackerName}
              isViewingHistoricalVersion={isViewingHistoricalVersion}
              onReturnToLatest={handleReturnToLatest}
              trackerId={trackerId ?? undefined}
              initialGridData={loadedSnapshot?.data ?? initialGridData}
              readOnly={isReadOnly}
              versionControl={versionControl}
              vcCurrentBranch={vcCurrentBranch}
              vcBranches={vcBranches}
              onVcBranchSwitch={handleVcBranchSwitch}
              onVcBranchCreated={handleVcBranchCreated}
              onVcMergedToMain={handleVcMergedToMain}
              showDebugActions={showPanelUtilities}
            />
          </TabsContent>
          <TabsContent value="chat" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <TrackerChatPanel {...chatPanelProps} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )

  const desktopLayout = (
    <div
      className="h-screen box-border font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden flex flex-col pt-14 hidden md:flex"
      aria-hidden={!isDesktop}
    >
      <div ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
        <TrackerPanel
          schema={effectiveDisplaySchema}
          editMode={editMode}
          setEditMode={setEditMode}
          allowSchemaEditToggle={canEditSchema}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isStreamingTracker={isStreamingTracker}
          trackerDataRef={trackerDataRef}
          onGridDataChange={handleGridDataChange}
          handleSchemaChange={canEditSchema && editMode ? undoable.onSchemaChange : undefined}
          undo={canEditSchema && editMode ? undoable.undo : undefined}
          canUndo={canEditSchema && editMode ? undoable.canUndo : false}
          leftWidth={leftWidth}
          onShareClick={handleShareClick}
          trackerName={trackerName}
          isViewingHistoricalVersion={isViewingHistoricalVersion}
          onReturnToLatest={handleReturnToLatest}
          trackerId={trackerId ?? undefined}
          initialGridData={loadedSnapshot?.data ?? initialGridData}
          readOnly={isReadOnly}
          versionControl={versionControl}
          vcCurrentBranch={vcCurrentBranch}
          vcBranches={vcBranches}
          onVcBranchSwitch={handleVcBranchSwitch}
          onVcBranchCreated={handleVcBranchCreated}
          onVcMergedToMain={handleVcMergedToMain}
          showDebugActions={showPanelUtilities}
        />

        {isChatOpen && (
          <>
            <div
              className="w-px shrink-0 cursor-col-resize bg-border/50 hover:bg-border transition-colors"
              onPointerDown={handlePointerDown}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panels"
            />

            <section className="flex-1 min-w-[360px] flex flex-col overflow-hidden">
              <TrackerChatPanel {...chatPanelProps} />
            </section>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {mobileLayout}
      {desktopLayout}
      <ShareTrackerDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        trackerName={trackerName}
        onShare={(teamId, defaultRole) => {
          console.info('Share tracker with team', teamId, defaultRole)
        }}
      />
    </>
  )
}
