'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShareTrackerDialog } from '@/app/components/teams'
import {
  useUndoableSchemaChange,
} from '@/app/components/tracker-display/edit-mode'
import { INITIAL_TRACKER_SCHEMA } from '@/app/components/tracker-display/tracker-editor'
import { useTrackerNav } from '../TrackerNavContext'
import { useTrackerChat, type Message, type TrackerResponse } from '../hooks/useTrackerChat'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { TrackerPanel, type GridDataSnapshot } from './TrackerPanel'
import { TrackerChatPanel } from './TrackerChatPanel'
import type { BranchRecord } from '@/app/components/tracker-page/TrackerBranchPanel'

const MIN_LEFT_PX = 320
const MIN_RIGHT_PX = 360

export interface TrackerEditorViewProps {
  initialSchema?: TrackerResponse
  initialGridData?: GridDataSnapshot | null
  onSaveTracker?: (schema: TrackerResponse) => Promise<void>
  initialEditMode?: boolean
  initialChatOpen?: boolean
  trackerId?: string | null
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
}

export function TrackerAIView(props: TrackerEditorViewProps = {}) {
  const {
    initialSchema,
    initialGridData = null,
    onSaveTracker,
    initialEditMode = true,
    initialChatOpen = true,
    trackerId,
    initialConversationId,
    initialMessages,
    versionControl = false,
    initialBranchName,
    onBranchChange,
    pageMode = 'full',
    primaryNavAction = null,
    showPanelUtilities = true,
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
    conversationId: initialConversationId ?? undefined,
    initialMessages,
  })

  const isDesktop = useIsDesktop()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftWidth, setLeftWidth] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(initialEditMode && canEditSchema)
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen)
  const [mobileTab, setMobileTab] = useState<'preview' | 'chat'>('preview')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [schema, setSchema] = useState<TrackerResponse>(
    () => (initialSchema ?? INITIAL_TRACKER_SCHEMA) as TrackerResponse
  )
  const [viewingMessageIndex, setViewingMessageIndex] = useState<number | null>(null)
  type LoadedSnapshot = {
    id: string
    label: string | null
    data: GridDataSnapshot
    updatedAt?: string
  }
  const [loadedSnapshot, setLoadedSnapshot] = useState<LoadedSnapshot | null>(null)
  const [lastSyncedTracker, setLastSyncedTracker] = useState<TrackerResponse | null>(null)

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
  const trackerNavCtx = useTrackerNav()
  const setTrackerNav = trackerNavCtx?.setTrackerNav ?? null
  const setSaveState = trackerNavCtx?.setSaveState ?? null
  const saveDataRef = useRef<() => void>(() => { })
  const setTrackerNavRef = useRef(setTrackerNav)
  setTrackerNavRef.current = setTrackerNav
  const lastSyncedTrackerRef = useRef<TrackerResponse | null>(null)

  const handleDirectSave = useCallback(async () => {
    if (!trackerId) return
    const data = trackerDataRef.current?.() ?? {}
    try {
      const res = await fetch(`/api/trackers/${trackerId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (saved?.id && saved?.data) {
          setLoadedSnapshot({
            id: saved.id,
            label: saved.label ?? null,
            data: saved.data as GridDataSnapshot,
            updatedAt: saved.updatedAt,
          })
        }
      }
    } catch {
      // silent — nav bar handles display
    }
  }, [trackerId, trackerDataRef])

  const onRegisterSaveData = useCallback((fn: () => void) => {
    if (!versionControl) {
      saveDataRef.current = fn
    }
  }, [versionControl])

  useEffect(() => {
    if (activeTrackerData && viewingMessageIndex === null) {
      if (lastSyncedTrackerRef.current !== activeTrackerData) {
        lastSyncedTrackerRef.current = activeTrackerData
        setLastSyncedTracker(activeTrackerData)
        setSchema(activeTrackerData)
      }
    }
  }, [activeTrackerData, viewingMessageIndex])

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

  const handleSchemaChange = useCallback((next: TrackerResponse) => {
    setSchema(next)
    setActiveTrackerData(next)
  }, [setActiveTrackerData])

  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  const stableOnTrackerNameChange = useCallback((name: string) => {
    handleSchemaChange({ ...schemaRef.current, name })
  }, [handleSchemaChange])

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

  const router = useRouter()

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
    setSaveState({
      onSaveTracker: allowSaveTracker ? handleSaveTracker : null,
      onSaveData: allowSaveData ? () => saveDataRef.current?.() : null,
      isAgentBuilding: isLoading,
      primaryNavAction,
    })
  }, [setSaveState, handleSaveTracker, isLoading, allowSaveTracker, allowSaveData, primaryNavAction])

  useEffect(() => {
    if (!setSaveState) return
    return () => setSaveState({ onSaveTracker: null, onSaveData: null, isAgentBuilding: false, primaryNavAction: null })
  }, [setSaveState])

  const undoable = useUndoableSchemaChange(schema, handleSchemaChange)

  const handleViewHistoricalTracker = useCallback((trackerData: TrackerResponse, messageIndex: number) => {
    setSchema(trackerData)
    setViewingMessageIndex(messageIndex)
    setEditMode(false)
    setMobileTab('preview')
  }, [])

  const handleReturnToLatest = useCallback(() => {
    setViewingMessageIndex(null)
    if (activeTrackerData) {
      setLastSyncedTracker(activeTrackerData)
      setSchema(activeTrackerData)
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

  /**
   * Save current grid data to the current VC branch.
   * Creates main branch on first save if none exists.
   */
  const handleVcSaveData = useCallback(async () => {
    if (!trackerId) return
    const data = trackerDataRef.current?.() ?? {}
    const currentBranch = vcCurrentBranchRef.current

    if (currentBranch) {
      // Update existing branch
      const res = await fetch(`/api/trackers/${trackerId}/branches/${currentBranch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (res.ok) {
        const updated = (await res.json()) as BranchRecord
        setVcBranches((prev) => prev.map((b) => b.id === updated.id ? updated : b))
        setVcCurrentBranch(updated)
        const snapshot: LoadedSnapshot = {
          id: updated.id,
          label: updated.label ?? updated.branchName,
          data: updated.data as GridDataSnapshot,
          updatedAt: updated.updatedAt,
        }
        setLoadedSnapshot(snapshot)
      }
    } else {
      // Create initial main branch
      const res = await fetch(`/api/trackers/${trackerId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, branchName: 'main', label: 'main' }),
      })
      if (res.ok) {
        const newBranch = (await res.json()) as BranchRecord
        setVcBranches([newBranch])
        setVcCurrentBranch(newBranch)
        const snapshot: LoadedSnapshot = {
          id: newBranch.id,
          label: newBranch.label ?? newBranch.branchName,
          data: newBranch.data as GridDataSnapshot,
          updatedAt: newBranch.updatedAt,
        }
        setLoadedSnapshot(snapshot)
      }
    }
  }, [trackerId, trackerDataRef])

  useEffect(() => {
    if (versionControl) {
      saveDataRef.current = handleVcSaveData
    } else {
      saveDataRef.current = handleDirectSave
    }
  }, [versionControl, handleVcSaveData, handleDirectSave])

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
    isLoading,
    validationErrors,
    error,
    generationErrorMessage,
    resumingAfterError,
    onContinue: handleContinue,
    messagesLength: messages.length,
    hasGeneratedTracker,
    hasAnyAssistantResponse,
  }

  const chatPanelProps = {
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
