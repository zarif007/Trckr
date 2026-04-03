'use client'

import { memo, useCallback, useState } from 'react'
import { Bot, Check, Database, Eye, GitBranch, History, Layout, Loader2, MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
} from '@/app/components/tracker-display/edit-mode'
import { TrackerBranchPanel } from '@/app/components/tracker-page/TrackerBranchPanel'
import type { BranchRecord } from '@/app/components/tracker-page/TrackerBranchPanel'
import type { TrackerResponse } from '../hooks/useTrackerChat'
import type { ForeignBindingNavUiState } from '@/app/components/tracker-display/types'
import type { OwnerScopeSettingsBanner } from '@/app/tracker/views/TrackerAIView/types'
import { parseProjectModuleSettings } from '@/lib/master-data-scope'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const DEFAULT_LEFT_RATIO = 0.75

function OwnerScopeSettingsReadout({ banner }: { banner: OwnerScopeSettingsBanner }) {
 const title = banner.source === 'project' ? 'Project settings' : 'Module settings'
 const parsed = parseProjectModuleSettings(banner.settings)
 const scopeHint = parsed.masterDataDefaultScope

 return (
 <div
 className="mb-3 rounded-sm border border-border/60 bg-muted/20 px-3 py-2.5"
 role="region"
 aria-label={title}
 >
 <p className="text-xs font-semibold text-foreground">{title}</p>
 <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
 Stored on this {banner.source} in the database (<code className="text-[10px]">settings</code>{' '}
 column), separate from the tracker form below.
 </p>
 {scopeHint ? (
 <p className="text-xs text-foreground mt-2">
 Default master data scope: <span className="font-medium">{scopeHint}</span>
 </p>
 ) : null}
 {banner.settings == null ? (
 <p className="text-xs text-muted-foreground mt-2">No JSON is stored yet.</p>
 ) : (
 <pre className="mt-2 max-h-48 overflow-auto rounded-sm border border-border/50 bg-muted/40 p-2.5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
 {JSON.stringify(banner.settings, null, 2)}
 </pre>
 )}
 </div>
 )
}

export type GridDataSnapshot = Record<string, Array<Record<string, unknown>>>

interface TrackerPanelProps {
 schema: TrackerResponse
 editMode: boolean
 setEditMode: (v: boolean) => void
 allowSchemaEditToggle?: boolean
 isChatOpen: boolean
 setIsChatOpen: (v: boolean | ((prev: boolean) => boolean)) => void
 isStreamingTracker: boolean
 isAgentRunning?: boolean
 trackerDataRef: React.RefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
 onGridDataChange?: (data: GridDataSnapshot) => void
 handleSchemaChange?: (next: TrackerResponse) => void
 undo?: () => void
 canUndo?: boolean
 leftWidth: number | null
 fullWidth?: boolean
 hideChatToggle?: boolean
 trackerName?: string
 isViewingHistoricalVersion?: boolean
 onReturnToLatest?: () => void
 trackerId?: string | null
 projectId?: string | null
 initialGridData?: GridDataSnapshot | null
 readOnly?: boolean
 /** Version control props — only relevant when versionControl === true */
 versionControl?: boolean
 vcCurrentBranch?: BranchRecord | null
 vcBranches?: BranchRecord[]
 onVcBranchSwitch?: (branch: BranchRecord) => void
 onVcBranchCreated?: (branch: BranchRecord) => void
 onVcMergedToMain?: (updatedMain: BranchRecord) => void
 showDebugActions?: boolean
 /** When true, show a persistent Save button in the preview (single instance non-autosave). */
 showPreviewSaveButton?: boolean
 onPreviewSave?: () => void | Promise<void>
 previewSaveStatus?: 'idle' | 'saving' | 'saved' | 'error'
 onForeignBindingNavUiChange?: (ui: ForeignBindingNavUiState | null) => void
 ownerScopeSettingsBanner?: OwnerScopeSettingsBanner
 onImportData?: (data: GridDataSnapshot) => void
}

export const TrackerPanel = memo(function TrackerPanel({
 schema,
 editMode,
 setEditMode,
 allowSchemaEditToggle = true,
 isChatOpen,
 setIsChatOpen,
 isStreamingTracker,
 isAgentRunning = false,
 trackerDataRef,
 onGridDataChange,
 handleSchemaChange,
 undo,
 canUndo,
 leftWidth,
 fullWidth,
 hideChatToggle,
 isViewingHistoricalVersion,
 onReturnToLatest,
 trackerId,
 projectId,
 initialGridData,
 readOnly,
 versionControl,
 vcCurrentBranch,
 vcBranches,
 onVcBranchSwitch,
 onVcBranchCreated,
 onVcMergedToMain,
 showDebugActions = true,
 showPreviewSaveButton = false,
 onPreviewSave,
 previewSaveStatus = 'idle',
 onForeignBindingNavUiChange,
 ownerScopeSettingsBanner,
 onImportData,
}: TrackerPanelProps) {
 const displayKey = 'tracker-display'
 const [debugView, setDebugView] = useState<'structure' | 'data' | null>(null)
 const [dataSnapshot, setDataSnapshot] = useState<Record<string, Array<Record<string, unknown>>> | null>(null)
 const [moreOpen, setMoreOpen] = useState(false)
 const [vcDrawerOpen, setVcDrawerOpen] = useState(false)
 const [importJson, setImportJson] = useState('')
 const [importError, setImportError] = useState<string | null>(null)

 useUndoKeyboardShortcut(editMode, canUndo ?? false, undo)

 const handleShowStructure = useCallback(() => {
 setDataSnapshot(null)
 setDebugView('structure')
 }, [])
 const handleShowData = useCallback(() => {
 const data = trackerDataRef.current?.() ?? {}
 setDataSnapshot(data)
 setDebugView('data')
 setImportJson('')
 setImportError(null)
 }, [trackerDataRef])

 const getCurrentData = useCallback((): GridDataSnapshot => {
 return trackerDataRef.current?.() ?? {}
 }, [trackerDataRef])

 const parseImportJson = useCallback((raw: string): GridDataSnapshot | string => {
 try {
 const parsed = JSON.parse(raw)
 if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
 return 'Must be a JSON object (e.g. { "gridId": [...rows] })'
 }
 for (const [key, val] of Object.entries(parsed)) {
 if (!Array.isArray(val)) return `Value for "${key}" must be an array of rows`
 }
 return parsed as GridDataSnapshot
 } catch {
 return 'Invalid JSON'
 }
 }, [])

 const handleImportData = useCallback(() => {
 const result = parseImportJson(importJson)
 if (typeof result === 'string') {
 setImportError(result)
 return
 }
 onImportData?.(result)
 setDebugView(null)
 setImportJson('')
 setImportError(null)
 }, [importJson, parseImportJson, onImportData])

 const debugJson =
 debugView === 'structure'
 ? JSON.stringify(schema, null, 2)
 : debugView === 'data' && dataSnapshot !== null
 ? JSON.stringify(dataSnapshot, null, 2)
 : ''

 return (
 <section
 className={cn(
 'relative h-full overflow-hidden bg-background/40 backdrop-blur-sm border-l border-border/20 transition-shadow duration-300',
 theme.radius.md
 )}
 style={{
 width: fullWidth ? '100%' : isChatOpen ? (leftWidth ? `${leftWidth}px` : `${DEFAULT_LEFT_RATIO * 100}%`) : '100%',
 }}
 >
 {isAgentRunning && (
 <div className="absolute top-0 left-0 right-0 z-30 h-1 overflow-hidden rounded-t-md bg-muted/40">
 <div className="h-full w-1/3 min-w-[120px] rounded-full bg-primary animate-progress-bar" />
 </div>
 )}
 {isViewingHistoricalVersion && (
 <div className="absolute top-0 left-0 right-0 z-30 px-3 py-1.5 bg-primary/5 border-b border-primary/20 backdrop-blur-sm">
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
 <div
 className={`absolute top-3 z-20 flex flex-wrap items-center justify-end gap-1 rounded-sm border border-border/30 bg-background/85 p-0.5 backdrop-blur-md max-w-[calc(100%-0.5rem)] ${hideChatToggle ? 'right-1' : 'right-3'}`}
 >
 {allowSchemaEditToggle && (
 <div className={`inline-flex shrink-0 items-center rounded-sm border border-border/40 bg-muted/20 p-0.5 ${isStreamingTracker ? 'opacity-60 pointer-events-none' : ''}`}>
 {hideChatToggle ? (
 <>
 <button
 type="button"
 onClick={() => setEditMode(false)}
 className={`p-1.5 rounded-sm transition-colors duration-150 ease-out ${!editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
 aria-pressed={!editMode}
 aria-label="Preview"
 disabled={isStreamingTracker}
 >
 <Eye className="h-3.5 w-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setEditMode(true)}
 className={`p-1.5 rounded-sm transition-colors duration-150 ease-out ${editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
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
 className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors duration-150 ease-out sm:px-3 ${!editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
 aria-pressed={!editMode}
 disabled={isStreamingTracker}
 >
 Preview
 </button>
 <button
 type="button"
 onClick={() => setEditMode(true)}
 className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors duration-150 ease-out sm:px-3 ${editMode ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
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
 <EditModeUndoButton
 undo={undo}
 canUndo={canUndo ?? false}
 visible={editMode}
 />
 </>
 )}
 </div>

 <Dialog open={debugView !== null} onOpenChange={(open) => !open && setDebugView(null)}>
 <DialogContent className={`max-w-2xl ${debugView === 'data' && onImportData ? 'max-h-[90vh]' : 'max-h-[85vh]'} flex flex-col`}>
 <DialogHeader>
 <DialogTitle className="text-base">
 {debugView === 'structure' ? 'Tracker structure' : 'Tracker data'}
 </DialogTitle>
 </DialogHeader>

 {debugView === 'data' && onImportData ? (
 <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
 <div className="flex flex-col gap-2">
 <p className="text-xs font-semibold text-foreground">Current data</p>
 <pre className="flex-1 min-h-[120px] overflow-auto rounded-sm bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-words border border-border/60">
 {debugJson || '{}'}
 </pre>
 </div>

 <div className="flex flex-col gap-2">
 <p className="text-xs font-semibold text-foreground">Import data</p>
 <textarea
 value={importJson}
 onChange={(e) => {
 setImportJson(e.target.value)
 setImportError(null)
 }}
 placeholder={`{ "gridId": [ { "fieldId": "value" } ] }`}
 className="flex-1 min-h-[120px] max-h-[200px] rounded-sm border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 />
 {importError && (
 <p className="text-xs text-destructive">{importError}</p>
 )}
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setDebugView(null)
 setImportJson('')
 setImportError(null)
 }}
 >
 Cancel
 </Button>
 <Button
 variant="default"
 size="sm"
 onClick={handleImportData}
 disabled={!importJson.trim()}
 >
 Import
 </Button>
 </div>
 </div>
 ) : (
 <pre className="flex-1 min-h-0 overflow-auto rounded-sm bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap break-words border border-border/60">
 {debugJson || '{}'}
 </pre>
 )}
 </DialogContent>
 </Dialog>

 <div
 className={`h-full overflow-y-auto ${hideChatToggle
 ? 'px-0 pt-12 pb-1'
 : 'px-2 pt-14 pb-2'
 }`}
 >
 {ownerScopeSettingsBanner && (
 <OwnerScopeSettingsReadout banner={ownerScopeSettingsBanner} />
 )}
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
 fieldRulesV2={schema.fieldRulesV2}
 dynamicOptions={(schema.dynamicOptions || {}) as TrackerResponse['dynamicOptions']}
 getDataRef={trackerDataRef}
 initialGridData={initialGridData ?? undefined}
 onGridDataChange={onGridDataChange}
 readOnly={readOnly}
 trackerSchemaId={trackerId}
 projectId={projectId ?? undefined}
 onForeignBindingNavUiChange={onForeignBindingNavUiChange}
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
 fieldRulesV2={schema.fieldRulesV2}
 dynamicOptions={schema.dynamicOptions}
 getDataRef={trackerDataRef}
 initialGridData={initialGridData ?? undefined}
 onGridDataChange={onGridDataChange}
 readOnly={readOnly}
 editMode={editMode}
 onSchemaChange={editMode ? handleSchemaChange : undefined}
 undo={undo}
 canUndo={canUndo}
 trackerSchemaId={trackerId}
 projectId={projectId ?? undefined}
 onForeignBindingNavUiChange={onForeignBindingNavUiChange}
 />
 )}
 </TrackerDisplayErrorBoundary>

 {showPreviewSaveButton && onPreviewSave && (
 <div className="sticky bottom-0 left-0 right-0 flex justify-end border-t border-border/60 bg-background/95 backdrop-blur-sm py-2.5 px-3 mt-3 -mb-2">
 <Button
 variant="outline"
 size="sm"
 className="h-9 min-w-[100px] gap-1.5 text-xs"
 disabled={previewSaveStatus === 'saving'}
 onClick={() => void onPreviewSave()}
 aria-label={previewSaveStatus === 'saved' ? 'Saved' : previewSaveStatus === 'saving' ? 'Saving' : 'Save'}
 >
 {previewSaveStatus === 'saving' ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 Saving…
 </>
 ) : previewSaveStatus === 'saved' ? (
 <>
 <Check className="h-3.5 w-3.5" />
 Saved
 </>
 ) : previewSaveStatus === 'error' ? (
 'Save failed'
 ) : (
 'Save'
 )}
 </Button>
 </div>
 )}
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
