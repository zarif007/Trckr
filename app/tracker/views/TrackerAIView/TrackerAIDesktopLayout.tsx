'use client'

import { TrackerPanel } from '../TrackerPanel'
import { TrackerChatPanel } from '../TrackerChatPanel'
import type { useTrackerAIView } from './useTrackerAIView'

export type TrackerAIDesktopLayoutProps = ReturnType<typeof useTrackerAIView>

export function TrackerAIDesktopLayout(state: TrackerAIDesktopLayoutProps) {
  const {
    isDesktop,
    containerRef,
    leftWidth,
    editMode,
    setEditMode,
    canEditSchema,
    isChatOpen,
    setIsChatOpen,
    handlePointerDown,
    effectiveDisplaySchema,
    isStreamingTracker,
    trackerDataRef,
    handleGridDataChange,
    undoable,
    handleShareClick,
    trackerName,
    isViewingHistoricalVersion,
    handleReturnToLatest,
    trackerId,
    loadedSnapshot,
    initialGridData,
    isReadOnly,
    versionControl,
    vcCurrentBranch,
    vcBranches,
    handleVcBranchSwitch,
    handleVcBranchCreated,
    handleVcMergedToMain,
    showPanelUtilities,
    showPreviewSaveButton,
    onPreviewSave,
    dataSaveStatus,
    chatPanelProps,
  } = state

  return (
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
          showPreviewSaveButton={showPreviewSaveButton}
          onPreviewSave={onPreviewSave}
          previewSaveStatus={dataSaveStatus}
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
}
