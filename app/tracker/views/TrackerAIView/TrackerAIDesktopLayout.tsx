"use client";

import { TrackerPanel } from "../TrackerPanel";
import { TrackerChatPanel } from "../TrackerChatPanel";
import type { useTrackerAIView } from "./useTrackerAIView";

export type TrackerAIDesktopLayoutProps = ReturnType<typeof useTrackerAIView>;

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
    isAgentRunning,
    disablePaginatedGridRowApi,
    trackerDataRef,
    handleGridDataChange,
    rowBackedPersistLifecycle,
    undoable,
    trackerName,
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
    showPreviewSaveButton,
    onPreviewSave,
    dataSaveStatus,
    chatPanelProps,
    reportForeignBindingNav,
    ownerScopeSettingsBanner,
  } = state;

  return (
    <div
      className="h-screen box-border font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden flex flex-col pt-12 hidden md:flex"
      aria-hidden={!isDesktop}
    >
      <div ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
        <TrackerPanel
          key={loadedSnapshot?.id ?? "default"}
          schema={effectiveDisplaySchema}
          editMode={editMode}
          setEditMode={setEditMode}
          allowSchemaEditToggle={canEditSchema}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isStreamingTracker={isStreamingTracker}
          isAgentRunning={isAgentRunning}
          disablePaginatedGridRowApi={disablePaginatedGridRowApi}
          trackerDataRef={trackerDataRef}
          onGridDataChange={handleGridDataChange}
          rowBackedPersistLifecycle={rowBackedPersistLifecycle}
          handleSchemaChange={
            canEditSchema && editMode ? undoable.onSchemaChange : undefined
          }
          undo={canEditSchema && editMode ? undoable.undo : undefined}
          canUndo={canEditSchema && editMode ? undoable.canUndo : false}
          leftWidth={leftWidth}
          trackerName={trackerName}
          isViewingHistoricalVersion={isViewingHistoricalVersion}
          onReturnToLatest={handleReturnToLatest}
          trackerId={trackerId ?? undefined}
          projectId={projectId ?? undefined}
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
          onForeignBindingNavUiChange={reportForeignBindingNav}
          ownerScopeSettingsBanner={ownerScopeSettingsBanner}
          onImportData={handleImportData}
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
  );
}
