'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUndoableSchemaChange } from '@/app/components/tracker-display/edit-mode'
import { INITIAL_TRACKER_SCHEMA } from '@/app/components/tracker-display/tracker-editor'
import type { ForeignBindingNavUiState, TrackerFormAction } from '@/app/components/tracker-display/types'
import { useTrackerNav } from '../../../TrackerNavContext'
import { useTrackerChat, type Message, type TrackerResponse } from '../../../hooks/useTrackerChat'
import { useAnalystChat } from '../../../hooks/useAnalystChat'
import { useIsDesktop } from '../../../hooks/useMediaQuery'
import { normalizeFormActions, normalizeTrackerSchema } from '../normalize'
import { type LoadedSnapshot, type TrackerEditorViewProps } from '../types'
import { useChatWindows } from './useChatWindows'
import { useFormActionsState } from './useFormActionsState'
import { useLayoutResize } from './useLayoutResize'
import { useTrackerDataSave } from './useTrackerDataSave'
import { useVersionControlState } from './useVersionControlState'

export function useTrackerAIView(props: TrackerEditorViewProps = {}) {
  const {
    initialSchema,
    initialGridData = null,
    onSaveTracker,
    initialEditMode = true,
    initialChatOpen = true,
    trackerId,
    projectId = null,
    moduleId = null,
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
    ownerScopeSettingsBanner,
  } = props

  const isDataPage = pageMode === 'data'
  const canEditSchema = !isDataPage
  const allowSaveTracker = !isDataPage
  const allowSaveData = pageMode !== 'schema'

  const builderMessagesRef = useRef<{ messages: Message[]; setMessages: (m: Message[] | ((prev: Message[]) => Message[])) => void }>({
    messages: [],
    setMessages: () => { },
  })
  const analystMessagesRef = useRef<{ messages: Message[]; setMessages: (m: Message[]) => void }>({
    messages: [],
    setMessages: () => { },
  })

  const chatWindows = useChatWindows(
    trackerId,
    isDataPage,
    initialConversationId,
    builderMessagesRef,
    analystMessagesRef
  )

  const {
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
  } = chatWindows

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
    setMessageToolsOpen,
    setMessageMasterDataFunctionsOpen,
    setMessageMasterDataCreatedOpen,
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
    isResolvingMasterData,
    phase,
    statusMessage,
  } = useTrackerChat({
    initialTracker: initialSchema ?? undefined,
    trackerId: trackerId ?? undefined,
    projectId: projectId ?? undefined,
    moduleId: moduleId ?? undefined,
    conversationId: isDataPage
      ? undefined
      : (activeBuilderWindowId?.startsWith('draft-')
        ? null
        : (activeBuilderWindowId || initialConversationId) ?? undefined),
    initialMessages: isDataPage ? undefined : initialMessages,
    onConversationCreate:
      !isDataPage && activeBuilderWindowId?.startsWith('draft-')
        ? onBuilderConversationCreate
        : undefined,
  })

  builderMessagesRef.current = { messages, setMessages }

  const analyst = useAnalystChat({
    trackerId: trackerId ?? undefined,
    conversationId: isDataPage
      ? (activeAnalystWindowId?.startsWith('draft-')
        ? null
        : (activeAnalystWindowId || initialConversationId) ?? undefined)
      : undefined,
    initialMessages: isDataPage ? initialMessages : undefined,
    trackerSchema: (initialSchema ?? activeTrackerData) as TrackerResponse | null,
    trackerDataRef,
    onConversationCreate:
      isDataPage && activeAnalystWindowId?.startsWith('draft-')
        ? onAnalystConversationCreate
        : undefined,
  })

  analystMessagesRef.current = { messages: analyst.messages, setMessages: analyst.setMessages }

  useEffect(() => {
    if (!activeBuilderWindowId) return
    builderWindowStateRef.current = {
      ...builderWindowStateRef.current,
      [activeBuilderWindowId]: {
        ...(builderWindowStateRef.current[activeBuilderWindowId] ?? {}),
        messages,
      },
    }
  }, [messages, activeBuilderWindowId, builderWindowStateRef])

  useEffect(() => {
    if (!activeAnalystWindowId) return
    analystWindowStateRef.current = {
      ...analystWindowStateRef.current,
      [activeAnalystWindowId]: {
        ...(analystWindowStateRef.current[activeAnalystWindowId] ?? {}),
        messages: analyst.messages,
      },
    }
  }, [analyst.messages, activeAnalystWindowId, analystWindowStateRef])

  const isDesktop = useIsDesktop()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [editMode, setEditMode] = useState(initialEditMode && canEditSchema)
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen)
  const [mobileTab, setMobileTab] = useState<'preview' | 'chat'>('preview')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [schema, setSchema] = useState<TrackerResponse>(
    () => normalizeTrackerSchema((initialSchema ?? INITIAL_TRACKER_SCHEMA) as TrackerResponse)
  )
  const [viewingMessageIndex, setViewingMessageIndex] = useState<number | null>(null)
  const [loadedSnapshot, setLoadedSnapshot] = useState<LoadedSnapshot | null>(null)
  const [currentFormStatus, setCurrentFormStatus] = useState<string | null>(initialFormStatus)
  const [formActionSaving, setFormActionSaving] = useState(false)
  const [formActionError, setFormActionError] = useState<string | null>(null)
  const formStatusRef = useRef<string | null>(initialFormStatus)
  const instanceIdRef = useRef<string | null>(instanceId)
  const [lastSyncedTracker, setLastSyncedTracker] = useState<TrackerResponse | null>(null)
  const trackerNavCtx = useTrackerNav()
  const setTrackerNav = trackerNavCtx?.setTrackerNav ?? null
  const setSaveState = trackerNavCtx?.setSaveState ?? null
  const saveDataRef = useRef<() => Promise<void>>(async () => { })
  const setTrackerNavRef = useRef(setTrackerNav)
  setTrackerNavRef.current = setTrackerNav
  const lastSyncedTrackerRef = useRef<TrackerResponse | null>(null)

  useEffect(() => {
    formStatusRef.current = currentFormStatus
  }, [currentFormStatus])
  useEffect(() => {
    setCurrentFormStatus(initialFormStatus ?? null)
  }, [initialFormStatus])
  useEffect(() => {
    instanceIdRef.current = instanceId
  }, [instanceId])
  useEffect(() => {
    if (!loadedSnapshot) return
    setCurrentFormStatus(loadedSnapshot.formStatus ?? null)
  }, [loadedSnapshot])
  useEffect(() => {
    if (!canEditSchema && editMode) setEditMode(false)
  }, [canEditSchema, editMode])

  const vc = useVersionControlState(
    versionControl,
    trackerId,
    initialBranchName,
    onBranchChange
  )

  const {
    vcBranches,
    setVcBranches,
    vcCurrentBranch,
    setVcCurrentBranch,
    vcCurrentBranchRef,
    loadedSnapshot: vcLoadedSnapshot,
    setLoadedSnapshot: setVcLoadedSnapshot,
    handleVcBranchSwitch,
    handleVcBranchCreated,
    handleVcMergedToMain,
  } = vc

  useEffect(() => {
    if (vcLoadedSnapshot != null) setLoadedSnapshot(vcLoadedSnapshot)
  }, [vcLoadedSnapshot])
  const setLoadedSnapshotFromSave = useCallback((s: LoadedSnapshot | null) => {
    setLoadedSnapshot(s)
    setVcLoadedSnapshot(s)
  }, [setVcLoadedSnapshot])

  const handleImportData = useCallback((data: Record<string, Array<Record<string, unknown>>>) => {
    setLoadedSnapshot({
      id: `import-${Date.now()}`,
      label: null,
      data,
    })
  }, [])

  const formActionsState = useFormActionsState(schema, currentFormStatus)
  const { formActions, effectiveCurrentFormStatus, isReadOnly } = formActionsState

  const allowAutoSave =
    autoSave &&
    instanceType === 'SINGLE' &&
    !versionControl &&
    pageMode === 'data' &&
    !isReadOnly
  const allowSchemaAutoSave = schemaAutoSave && pageMode === 'schema' && Boolean(onSaveTracker)

  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  const dataSave = useTrackerDataSave({
    trackerId,
    trackerDataRef,
    versionControl,
    instanceType,
    instanceId,
    formStatusRef,
    vcCurrentBranchRef,
    instanceIdRef,
    setLoadedSnapshot: setLoadedSnapshotFromSave,
    setVcBranches,
    setVcCurrentBranch,
    setCurrentFormStatus,
    setFormActionSaving,
    setFormActionError,
    allowAutoSave,
    allowSchemaAutoSave,
    schemaRef,
    onSaveTracker,
  })

  const {
    saveTrackerData,
    dataSaveStatus,
    dataSaveError,
    schemaSaveStatus,
    schemaSaveError,
    handleGridDataChange,
    handleFormActionSelect,
  } = dataSave

  const { leftWidth, handlePointerDown } = useLayoutResize(
    containerRef,
    isChatOpen,
    isDesktop
  )

  const trackerName = schema?.name ?? schema?.tabs?.[0]?.name ?? 'Untitled tracker'

  const handleSchemaChange = useCallback(
    (next: TrackerResponse) => {
      const normalizedNext = normalizeTrackerSchema(next)
      setSchema(normalizedNext)
      setActiveTrackerData(normalizedNext)
      if (allowSchemaAutoSave) dataSave.scheduleSchemaSave()
    },
    [setActiveTrackerData, allowSchemaAutoSave, dataSave]
  )

  const stableOnTrackerNameChange = useCallback(
    (name: string) => {
      handleSchemaChange({ ...schemaRef.current, name })
    },
    [handleSchemaChange]
  )

  const onNameChangeRef = useRef(stableOnTrackerNameChange)
  onNameChangeRef.current = stableOnTrackerNameChange

  const onNameChangeStable = useCallback((name: string) => {
    onNameChangeRef.current(name)
  }, [])

  const handleFormActionsChange = useCallback(
    (actions: TrackerFormAction[]) => {
      handleSchemaChange({
        ...schemaRef.current,
        formActions: normalizeFormActions(actions),
      })
    },
    [handleSchemaChange]
  )

  const formActionsChangeRef = useRef(handleFormActionsChange)
  formActionsChangeRef.current = handleFormActionsChange
  const formActionsChangeStable = useCallback((actions: TrackerFormAction[]) => {
    formActionsChangeRef.current(actions)
  }, [])

  const formActionSelectRef = useRef(handleFormActionSelect)
  formActionSelectRef.current = handleFormActionSelect
  const formActionSelectStable = useCallback(
    (action: TrackerFormAction) => {
      formActionSelectRef.current(action)
    },
    []
  )

  useEffect(() => {
    if (!setTrackerNav) return
    setTrackerNav({ name: trackerName, onNameChange: onNameChangeStable })
  }, [setTrackerNav, trackerName, onNameChangeStable])

  useEffect(() => {
    return () => setTrackerNavRef.current?.(null)
  }, [])

  const reportForeignBindingNav = useCallback(
    (ui: ForeignBindingNavUiState | null) => {
      if (!setSaveState) return
      if (ui === null) {
        setSaveState({
          foreignLinkedSourcesLoading: false,
          foreignLinkedSourcesSaving: false,
          foreignLinkedPersistError: null,
          onDismissForeignLinkedPersistError: null,
        })
        return
      }
      setSaveState({
        foreignLinkedSourcesLoading: ui.loading,
        foreignLinkedSourcesSaving: ui.saving,
        foreignLinkedPersistError: ui.error,
        onDismissForeignLinkedPersistError: ui.dismissError,
      })
    },
    [setSaveState]
  )

  const handleSaveTracker = useCallback(async () => {
    if (onSaveTracker) {
      await onSaveTracker(schema)
      return
    }
    const res = await fetch('/api/trackers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new: true, name: trackerName, schema }),
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
    const showFormActions =
      !allowSchemaAutoSave &&
      !allowAutoSave &&
      (isDataPage ? instanceType === 'MULTI' : (canEditSchema && editMode))
    // Sticky footer Save in the preview panel is disabled; use top nav Save or Action menu.
    const showPreviewSaveButton = false
    const showActionsConfig =
      canEditSchema &&
      editMode &&
      (!allowSchemaAutoSave || !autoSave) &&
      !(instanceType === 'SINGLE' && versionControl)
    setSaveState({
      onSaveTracker: exposeManualTrackerSave ? handleSaveTracker : null,
      onSaveData: showManualSaveData ? () => saveDataRef.current() : null,
      isAgentBuilding: isLoading,
      primaryNavAction,
      autosaveEnabled: autosaveEnabledForNav,
      dataSaveStatus: navDataSaveStatus,
      dataSaveError: navDataSaveError,
      // Always pass schema form actions so Configure actions can load saved rows on the edit page
      // (showFormActions only gates the data-entry Action menu + onFormActionSelect).
      formActions,
      currentFormStatus: isDataPage ? effectiveCurrentFormStatus : null,
      formActionSaving: isDataPage ? formActionSaving : false,
      formActionError: isDataPage ? formActionError : null,
      canConfigureFormActions: showActionsConfig,
      onFormActionsChange: showActionsConfig ? formActionsChangeStable : null,
      onFormActionSelect: isDataPage && showFormActions ? formActionSelectStable : null,
      showPreviewSaveButton,
      titleEditable: !isDataPage && canEditSchema && editMode,
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
    formActionSaving,
    formActionError,
    canEditSchema,
    editMode,
    autoSave,
    formActionsChangeStable,
    isDataPage,
    instanceType,
    versionControl,
    formActionSelectStable,
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
        formActionSaving: false,
        formActionError: null,
        canConfigureFormActions: false,
        onFormActionsChange: null,
        onFormActionSelect: null,
        showPreviewSaveButton: false,
        titleEditable: false,
        foreignLinkedSourcesLoading: false,
        foreignLinkedSourcesSaving: false,
        foreignLinkedPersistError: null,
        onDismissForeignLinkedPersistError: null,
      })
  }, [setSaveState])

  const undoable = useUndoableSchemaChange(schema, handleSchemaChange)

  const handleViewHistoricalTracker = useCallback(
    (trackerData: TrackerResponse, messageIndex: number) => {
      setSchema(normalizeTrackerSchema(trackerData))
      setViewingMessageIndex(messageIndex)
      setEditMode(false)
      setMobileTab('preview')
    },
    []
  )

  const handleReturnToLatest = useCallback(() => {
    setViewingMessageIndex(null)
    if (activeTrackerData) {
      setLastSyncedTracker(activeTrackerData)
      setSchema(normalizeTrackerSchema(activeTrackerData))
    }
  }, [activeTrackerData])

  useEffect(() => {
    if (activeTrackerData && viewingMessageIndex === null) {
      if (lastSyncedTrackerRef.current !== activeTrackerData) {
        lastSyncedTrackerRef.current = activeTrackerData
        setLastSyncedTracker(activeTrackerData)
        setSchema(normalizeTrackerSchema(activeTrackerData))
        if (allowSchemaAutoSave) dataSave.scheduleSchemaSave()
      }
    }
  }, [activeTrackerData, viewingMessageIndex, allowSchemaAutoSave, dataSave])

  const effectiveDisplaySchema = useMemo(() => {
    const isTrackerBusy =
      isLoading || isResolvingExpressions || isResolvingMasterData
    if (isTrackerBusy && streamedDisplayTracker) return streamedDisplayTracker
    if (viewingMessageIndex !== null) return schema
    if (activeTrackerData && lastSyncedTracker !== activeTrackerData) return activeTrackerData
    return schema
  }, [
    isLoading,
    isResolvingExpressions,
    isResolvingMasterData,
    streamedDisplayTracker,
    viewingMessageIndex,
    activeTrackerData,
    schema,
    lastSyncedTracker,
  ])

  useEffect(() => {
    saveDataRef.current = () => saveTrackerData().then(() => undefined)
  }, [saveTrackerData])

  const onPreviewSave = useCallback(() => {
    return saveDataRef.current?.() ?? Promise.resolve()
  }, [])

  const handleSubmitWithReset = useCallback(() => {
    setViewingMessageIndex(null)
    if (input.trim()) updateBuilderTitleFromInput(input)
    handleSubmit()
  }, [handleSubmit, input, updateBuilderTitleFromInput])

  const handleAnalystSubmitWithTitle = useCallback(() => {
    if (analyst.input.trim()) updateAnalystTitleFromInput(analyst.input)
    analyst.handleSubmit()
  }, [analyst, updateAnalystTitleFromInput])

  useEffect(() => {
    if (isDesktop && mobileTab === 'chat') setIsChatOpen(true)
  }, [isDesktop, mobileTab])

  useEffect(() => {
    if (isLoading || isResolvingExpressions || isResolvingMasterData) setEditMode(false)
  }, [isLoading, isResolvingExpressions, isResolvingMasterData])

  const hasGeneratedTracker = useMemo(
    () => messages.some((message) => Boolean(message.trackerData)),
    [messages]
  )
  const lastTrackerMessageIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].trackerData) return i
    }
    return null
  }, [messages])
  const isViewingHistoricalVersion = useMemo(() => {
    if (viewingMessageIndex === null) return false
    if (lastTrackerMessageIndex === null) return false
    return viewingMessageIndex !== lastTrackerMessageIndex
  }, [viewingMessageIndex, lastTrackerMessageIndex])

  const streamedObject = object as
    | { tracker?: unknown; trackerPatch?: unknown }
    | undefined
  const isStreamingTracker = Boolean(
    isLoading &&
      (streamedDisplayTracker ||
        streamedObject?.tracker != null ||
        streamedObject?.trackerPatch != null),
  )
  // True during all agent phases (manager, master-data, builder) — used for the progress bar.
  const isAgentRunning = isLoading
  const hasAnyAssistantResponse = messages.some((m) => m.role === 'assistant')
  const showStatusPanel =
    Boolean(error) ||
    Boolean(generationErrorMessage) ||
    validationErrors.length > 0 ||
    (!isLoading && messages.length > 0 && !hasGeneratedTracker && hasAnyAssistantResponse)

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
      handleSubmit: handleAnalystSubmitWithTitle,
      applySuggestion: analyst.applySuggestion,
      isLoading: analyst.isLoading,
      isChatEmpty: analyst.isChatEmpty,
      textareaRef: analyst.textareaRef,
      messages: analyst.messages,
      setMessageThinkingOpen: analyst.setMessageThinkingOpen,
      setMessageToolsOpen: analyst.setMessageToolsOpen,
      messagesEndRef: analyst.messagesEndRef,
      object: analyst.object,
      onViewTracker: undefined,
      activeTrackerMessageIndex: undefined,
      toolCalls: undefined,
      isResolvingExpressions: false,
      isResolvingMasterData: false,
      mode: 'data' as const,
      isConversationLoading: analystConversationLoading,
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
      setMessageToolsOpen,
      setMessageMasterDataFunctionsOpen,
      setMessageMasterDataCreatedOpen,
      messagesEndRef,
      object,
      onViewTracker: handleViewHistoricalTracker,
      activeTrackerMessageIndex: viewingMessageIndex ?? lastTrackerMessageIndex,
      toolCalls,
      isResolvingExpressions,
      isResolvingMasterData,
      statusMessage,
      mode: 'schema' as const,
      isConversationLoading: builderConversationLoading,
      conversationWindows: builderChatWindows,
      activeConversationId: activeBuilderWindowId,
      onSelectConversation: handleBuilderWindowSelect,
      onCreateConversation: handleBuilderWindowCreate,
    }

  return {
    isDesktop,
    containerRef,
    mobileTab,
    setMobileTab,
    leftWidth,
    editMode,
    setEditMode,
    isChatOpen,
    setIsChatOpen,
    handlePointerDown,
    shareDialogOpen,
    setShareDialogOpen,
    trackerName,
    handleShareClick: () => setShareDialogOpen(true),
    effectiveDisplaySchema,
    canEditSchema,
    isStreamingTracker,
    isResolvingMasterData,
    isAgentRunning,
    trackerDataRef,
    handleGridDataChange,
    undoable,
    isViewingHistoricalVersion,
    handleReturnToLatest,
    trackerId,
    projectId,
    loadedSnapshot,
    initialGridData,
    isReadOnly,
    versionControl,
    vcCurrentBranch,
    vcBranches,
    handleVcBranchSwitch,
    handleVcBranchCreated,
    handleVcMergedToMain,
    handleImportData,
    showPanelUtilities,
    showPreviewSaveButton: false,
    onPreviewSave,
    dataSaveStatus,
    chatPanelProps,
    reportForeignBindingNav,
    ownerScopeSettingsBanner,
  }
}
