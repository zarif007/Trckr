"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackerPanel } from "../TrackerPanel";
import { TrackerChatPanel } from "../TrackerChatPanel";
import type { useTrackerAIView } from "./useTrackerAIView";

export type TrackerAIMobileLayoutProps = ReturnType<typeof useTrackerAIView>;

export function TrackerAIMobileLayout(state: TrackerAIMobileLayoutProps) {
  const {
    isDesktop,
    mobileTab,
    setMobileTab,
    leftWidth,
    editMode,
    setEditMode,
    canEditSchema,
    isChatOpen,
    setIsChatOpen,
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
      className="h-screen box-border font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden flex flex-col pt-12 md:hidden"
      aria-hidden={isDesktop}
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as "preview" | "chat")}
          className="flex-1 min-h-0 flex flex-col gap-0"
        >
          <div className="shrink-0 px-1 py-1.5 border-b border-border/60 bg-background/95 backdrop-blur">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="preview"
            className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
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
              fullWidth
              hideChatToggle
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
          </TabsContent>
          <TabsContent
            value="chat"
            className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
            <TrackerChatPanel {...chatPanelProps} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
