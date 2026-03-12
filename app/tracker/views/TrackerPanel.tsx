'use client'

import { memo, useCallback, useState } from 'react'
import { Bot, Database, Eye, GitBranch, History, Layout, MoreHorizontal, Pencil, Share2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TrackerDisplay, TrackerDisplayErrorBoundary } from '@/app/components/tracker-display'
import {
  EditModeUndoButton,
  useUndoKeyboardShortcut,
  FormActionsDialog,
} from '@/app/components/tracker-display/edit-mode'
import { TrackerBranchPanel } from '@/app/components/tracker-page/TrackerBranchPanel'
import type { BranchRecord } from '@/app/components/tracker-page/TrackerBranchPanel'
import type { TrackerResponse } from '../hooks/useTrackerChat'
import type { TrackerFormAction } from '@/app/components/tracker-display/types'

const DEFAULT_LEFT_RATIO = 0.75

export type GridDataSnapshot = Record<string, Array<Record<string, unknown>>>

interface TrackerPanelProps {
  schema: TrackerResponse
  editMode: boolean
  setEditMode: (v: boolean) => void
  allowSchemaEditToggle?: boolean
  isChatOpen: boolean
  setIsChatOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  isStreamingTracker: boolean
  trackerDataRef: React.RefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
  onGridDataChange?: (data: GridDataSnapshot) => void
  handleSchemaChange?: (next: TrackerResponse) => void
  undo?: () => void
  canUndo?: boolean
  leftWidth: number | null
  fullWidth?: boolean
  hideChatToggle?: boolean
  onShareClick?: () => void
  trackerName?: string
  isViewingHistoricalVersion?: boolean
  onReturnToLatest?: () => void
  trackerId?: string | null
  initialGridData?: GridDataSnapshot | null
  readOnly?: boolean
  formActions?: TrackerFormAction[]
  currentFormStatus?: string | null
  onFormActionSelect?: (action: TrackerFormAction) => void
  formActionSaving?: boolean
  formActionError?: string | null
  showFormActions?: boolean
  /** Version control props — only relevant when versionControl === true */
  versionControl?: boolean
  vcCurrentBranch?: BranchRecord | null
  vcBranches?: BranchRecord[]
  onVcBranchSwitch?: (branch: BranchRecord) => void
  onVcBranchCreated?: (branch: BranchRecord) => void
  onVcMergedToMain?: (updatedMain: BranchRecord) => void
  showDebugActions?: boolean
}

export const TrackerPanel = memo(function TrackerPanel({
  schema,
  editMode,
  setEditMode,
  allowSchemaEditToggle = true,
  isChatOpen,
  setIsChatOpen,
  isStreamingTracker,
  trackerDataRef,
  onGridDataChange,
  handleSchemaChange,
  undo,
  canUndo,
  leftWidth,
  fullWidth,
  hideChatToggle,
  onShareClick,
  isViewingHistoricalVersion,
  onReturnToLatest,
  trackerId,
  initialGridData,
  readOnly,
  formActions,
  currentFormStatus,
  onFormActionSelect,
  formActionSaving = false,
  formActionError,
  showFormActions = false,
  versionControl,
  vcCurrentBranch,
  vcBranches,
  onVcBranchSwitch,
  onVcBranchCreated,
  onVcMergedToMain,
  showDebugActions = true,
}: TrackerPanelProps) {
  const displayKey = 'tracker-display'
  const [debugView, setDebugView] = useState<'structure' | 'data' | null>(null)
  const [dataSnapshot, setDataSnapshot] = useState<Record<string, Array<Record<string, unknown>>> | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [vcDrawerOpen, setVcDrawerOpen] = useState(false)
  const [formActionsOpen, setFormActionsOpen] = useState(false)

  const actions = formActions ?? []
  const activeAction = actions.find((action) =>
    action.statusTag.trim().toLowerCase() === (currentFormStatus ?? '').trim().toLowerCase()
  )

  useUndoKeyboardShortcut(editMode, canUndo ?? false, undo)

  const handleShowStructure = useCallback(() => {
    setDataSnapshot(null)
    setDebugView('structure')
  }, [])
  const handleShowData = useCallback(() => {
    const data = trackerDataRef.current?.() ?? {}
    setDataSnapshot(data)
    setDebugView('data')
  }, [trackerDataRef])

  const getCurrentData = useCallback((): GridDataSnapshot => {
    return trackerDataRef.current?.() ?? {}
  }, [trackerDataRef])

  const debugJson =
    debugView === 'structure'
      ? JSON.stringify(schema, null, 2)
      : debugView === 'data' && dataSnapshot !== null
        ? JSON.stringify(dataSnapshot, null, 2)
        : ''

  return (
    <section
      className="relative h-full bg-background/60 rounded-lg transition-shadow duration-300 overflow-hidden"
      style={{
        width: fullWidth ? '100%' : isChatOpen ? (leftWidth ? `${leftWidth}px` : `${DEFAULT_LEFT_RATIO * 100}%`) : '100%',
      }}
    >
      {isStreamingTracker && (
        <div className="absolute top-0 left-0 right-0 z-30 h-1 overflow-hidden rounded-t-lg bg-muted/40">
          <div className="h-full w-1/3 min-w-[120px] rounded-full bg-primary animate-progress-bar" />
        </div>
      )}
      {isViewingHistoricalVersion && (
        <div className="absolute top-0 left-0 right-0 z-30 px-4 py-2 bg-primary/10 border-b border-primary/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <History className="h-3.5 w-3.5" />
              <span>Viewing historical version</span>
            </div>
            {onReturnToLatest && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs font-medium text-primary hover:bg-primary/10"
                onClick={onReturnToLatest}
              >
                Return to latest
              </Button>
            )}
          </div>
        </div>
      )}
      {showFormActions && actions.length > 0 && (
        <div
          className={`absolute z-20 left-4 ${isViewingHistoricalVersion ? 'top-14' : 'top-4'} max-w-[calc(100%-2rem)]`}
        >
          <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/90 p-2 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Status</span>
              <Badge variant="secondary" className="text-[10px]">
                {currentFormStatus?.trim() || 'None'}
              </Badge>
              {activeAction && !activeAction.isEditable && (
                <Badge variant="outline" className="text-[10px]">
                  Read-only
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {actions.map((action) => {
                const isActive =
                  action.statusTag.trim().toLowerCase() ===
                  (currentFormStatus ?? '').trim().toLowerCase()
                return (
                  <Button
                    key={action.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={formActionSaving || isStreamingTracker}
                    onClick={() => onFormActionSelect?.(action)}
                  >
                    {action.label}
                  </Button>
                )
              })}
            </div>
            {formActionError && (
              <p className="text-[11px] text-destructive">{formActionError}</p>
            )}
          </div>
        </div>
      )}
      <div
        className={`absolute top-4 z-20 flex flex-wrap items-center justify-end gap-1.5 rounded-md border border-border/60 bg-background/90 p-1.5 shadow-sm max-w-[calc(100%-0.5rem)] ${hideChatToggle ? 'right-1' : 'right-4'}`}
      >
        {allowSchemaEditToggle && (
          <div className={`inline-flex shrink-0 items-center rounded-md border border-border/60 bg-background/80 p-0.5 ${isStreamingTracker ? 'opacity-60 pointer-events-none' : ''}`}>
            {hideChatToggle ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className={`p-1.5 rounded-md transition-colors ${!editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={!editMode}
                  aria-label="Preview"
                  disabled={isStreamingTracker}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className={`p-1.5 rounded-md transition-colors ${editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={editMode}
                  aria-label="Edit"
                  disabled={isStreamingTracker}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors sm:px-3 ${!editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={!editMode}
                  disabled={isStreamingTracker}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors sm:px-3 ${editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-pressed={editMode}
                  disabled={isStreamingTracker}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        )}
        {!hideChatToggle && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setIsChatOpen((prev) => !prev)}
            aria-label={isChatOpen ? 'Hide agent chat' : 'Show agent chat'}
          >
            <Bot className="h-4 w-4" />
          </Button>
        )}
        {versionControl && trackerId && onVcBranchSwitch && onVcBranchCreated && onVcMergedToMain && (
          <Button
            variant={vcDrawerOpen ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => setVcDrawerOpen((prev) => !prev)}
            aria-label={vcDrawerOpen ? 'Close version control' : 'Open version control'}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{vcCurrentBranch?.branchName ?? 'Branches'}</span>
          </Button>
        )}
        {editMode && handleSchemaChange && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => setFormActionsOpen(true)}
            aria-label="Configure form actions"
          >
            <Tag className="h-3.5 w-3.5" />
            Form actions
          </Button>
        )}
        {hideChatToggle && showDebugActions && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start gap-2 text-xs"
                  onClick={() => {
                    handleShowStructure()
                    setMoreOpen(false)
                  }}
                  aria-label="Show tracker structure (debug)"
                >
                  <Layout className="h-3.5 w-3.5 shrink-0" />
                  Structure
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start gap-2 text-xs"
                  onClick={() => {
                    handleShowData()
                    setMoreOpen(false)
                  }}
                  aria-label="Show tracker data (debug)"
                >
                  <Database className="h-3.5 w-3.5 shrink-0" />
                  Data
                </Button>
                {onShareClick && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 justify-start gap-2 text-xs"
                    onClick={() => {
                      onShareClick()
                      setMoreOpen(false)
                    }}
                    aria-label="Share tracker with team"
                  >
                    <Share2 className="h-3.5 w-3.5 shrink-0" />
                    Share
                  </Button>
                )}
                {editMode && undo != null && (
                  <EditModeUndoButton
                    undo={() => {
                      undo?.()
                      setMoreOpen(false)
                    }}
                    canUndo={canUndo ?? false}
                    visible
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 text-xs"
                  />
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {!hideChatToggle && showDebugActions && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleShowStructure}
              aria-label="Show tracker structure (debug)"
            >
              <Layout className="h-3.5 w-3.5" />
              Structure
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleShowData}
              aria-label="Show tracker data (debug)"
            >
              <Database className="h-3.5 w-3.5" />
              Data
            </Button>
            {onShareClick && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={onShareClick}
                aria-label="Share tracker with team"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            )}
            <EditModeUndoButton
              undo={undo}
              canUndo={canUndo ?? false}
              visible={editMode}
            />
          </>
        )}
      </div>

      <Dialog open={debugView !== null} onOpenChange={(open) => !open && setDebugView(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {debugView === 'structure' ? 'Tracker structure' : 'Tracker data'}
            </DialogTitle>
          </DialogHeader>
          <pre className="flex-1 min-h-0 overflow-auto rounded-md bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap break-words border border-border/60">
            {debugJson || '{}'}
          </pre>
        </DialogContent>
      </Dialog>

      <FormActionsDialog
        open={formActionsOpen}
        onOpenChange={setFormActionsOpen}
        actions={actions}
        onSave={(next) => {
          if (!handleSchemaChange) return
          handleSchemaChange({ ...schema, formActions: next })
        }}
      />

      <div
        className={`h-full overflow-y-auto ${hideChatToggle
          ? 'px-1 pt-14 pb-2'
          : 'px-4 pt-16 pb-6'
          }`}
      >
        <TrackerDisplayErrorBoundary key={displayKey}>
          {isStreamingTracker ? (
            <TrackerDisplay
              tabs={((schema.tabs || []) as unknown[]).filter(
                (t): t is TrackerResponse['tabs'][number] =>
                  !!t && typeof t === 'object' && 'name' in t && !!(t as { name?: string }).name
              ) as TrackerResponse['tabs']}
              sections={((schema.sections || []) as unknown[]).filter(
                (s): s is TrackerResponse['sections'][number] =>
                  !!s && typeof s === 'object' && 'name' in s && !!(s as { name?: string }).name
              ) as TrackerResponse['sections']}
              grids={((schema.grids || []) as unknown[]).filter(
                (g): g is TrackerResponse['grids'][number] =>
                  !!g && typeof g === 'object' && 'name' in g && !!(g as { name?: string }).name
              ) as TrackerResponse['grids']}
              fields={((schema.fields || []) as unknown[]).filter(
                (f): f is TrackerResponse['fields'][number] =>
                  !!f && typeof f === 'object' && 'ui' in f && !!((f as { ui?: { label?: string } }).ui?.label)
              ) as TrackerResponse['fields']}
              layoutNodes={(schema.layoutNodes || []) as TrackerResponse['layoutNodes']}
              bindings={(schema.bindings || {}) as TrackerResponse['bindings']}
              validations={(schema.validations || {}) as TrackerResponse['validations']}
              calculations={(schema.calculations || {}) as TrackerResponse['calculations']}
              styles={(schema.styles || {}) as TrackerResponse['styles']}
              dependsOn={(schema.dependsOn || []) as TrackerResponse['dependsOn']}
              dependsOnByTarget={schema.dependsOnByTarget}
              dynamicOptions={(schema.dynamicOptions || {}) as TrackerResponse['dynamicOptions']}
              getDataRef={trackerDataRef}
              initialGridData={initialGridData ?? undefined}
              onGridDataChange={onGridDataChange}
              readOnly={readOnly}
            />
          ) : (
            <TrackerDisplay
              tabs={schema.tabs}
              sections={schema.sections}
              grids={schema.grids}
              fields={schema.fields}
              formActions={schema.formActions}
              layoutNodes={schema.layoutNodes}
              bindings={schema.bindings}
              validations={schema.validations}
              calculations={schema.calculations}
              styles={schema.styles}
              dependsOn={schema.dependsOn}
              dependsOnByTarget={schema.dependsOnByTarget}
              dynamicOptions={schema.dynamicOptions}
              getDataRef={trackerDataRef}
              initialGridData={initialGridData ?? undefined}
              onGridDataChange={onGridDataChange}
              readOnly={readOnly}
              editMode={editMode}
              onSchemaChange={editMode ? handleSchemaChange : undefined}
              undo={undo}
              canUndo={canUndo}
            />
          )}
        </TrackerDisplayErrorBoundary>
      </div>

      {versionControl && trackerId && onVcBranchSwitch && onVcBranchCreated && onVcMergedToMain && (
        <TrackerBranchPanel
          trackerId={trackerId}
          currentBranch={vcCurrentBranch ?? null}
          branches={vcBranches ?? []}
          onBranchSwitch={onVcBranchSwitch}
          onBranchCreated={onVcBranchCreated}
          onMergedToMain={onVcMergedToMain}
          getCurrentData={getCurrentData}
          disabled={isStreamingTracker}
          open={vcDrawerOpen}
          onClose={() => setVcDrawerOpen(false)}
        />
      )}
    </section>
  )
})
