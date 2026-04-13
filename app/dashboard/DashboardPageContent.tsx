"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { FolderPlus, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { useDashboard, collectTrackersFromModules } from "./dashboard-context";
import type { Project, TrackerSchema } from "./dashboard-context";
import type { DashboardView } from "./dashboard-view";
import { DashboardHomeSkeleton } from "./components/skeleton/DashboardPageSkeleton";
import { MarqueeSelectionOverlay } from "./components/MarqueeSelectionOverlay";
import { useMarqueeSelection } from "./hooks/useMarqueeSelection";
import { DashboardHomeHeader } from "./components/home/DashboardHomeHeader";
import { DashboardSummaryMetrics } from "./components/home/DashboardSummaryMetrics";
import { DashboardProjectGrid } from "./components/home/DashboardProjectGrid";
import { DashboardProjectList } from "./components/home/DashboardProjectList";
import { DashboardRecentsSection } from "./components/home/DashboardRecentsSection";

export type { DashboardView } from "./dashboard-view";

function workspaceLastUpdatedLabel(
  projects: Project[],
  trackers: TrackerSchema[],
): string | null {
  const times: number[] = [];
  for (const p of projects) {
    times.push(new Date(p.updatedAt).getTime());
  }
  for (const t of trackers) {
    times.push(new Date(t.updatedAt).getTime());
  }
  if (times.length === 0) return null;
  const d = new Date(Math.max(...times));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DashboardPageContent({
  view = "all",
}: {
  view?: DashboardView;
}) {
  const { projects, projectsLoading, fetchProjects } = useDashboard();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const createProjectInputRef = useRef<HTMLInputElement>(null);
  const projectsMarquee = useMarqueeSelection();
  const recentsMarquee = useMarqueeSelection();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (createProjectOpen) {
      setProjectName("");
      requestAnimationFrame(() => createProjectInputRef.current?.focus());
    }
  }, [createProjectOpen]);

  const handleOpenCreateProject = useCallback(() => {
    setCreateProjectOpen(true);
  }, []);

  const handleCreateProject = useCallback(
    async (nameOverride?: string) => {
      const name = (nameOverride ?? projectName).trim() || "New Project";
      setCreating(true);
      setError(null);
      setCreateProjectOpen(false);
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to create project");
        await fetchProjects();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error creating project");
      } finally {
        setCreating(false);
      }
    },
    [projectName, fetchProjects],
  );

  const handleCreateProjectKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateProject(e.currentTarget.value);
      }
    },
    [handleCreateProject],
  );

  const allTrackers = projects.flatMap((p) => [
    ...(p.trackerSchemas ?? []).filter((t) => t.type === "GENERAL"),
    ...collectTrackersFromModules(p.modules ?? []),
  ]);
  const trackersById = new Map(allTrackers.map((t) => [t.id, t]));
  const uniqueTrackers = [...trackersById.values()];
  const totalTrackers = uniqueTrackers.length;
  const recentTrackers = uniqueTrackers
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  const lastActivityLabel = useMemo(() => {
    const trackers = projects.flatMap((p) => [
      ...(p.trackerSchemas ?? []).filter((t) => t.type === "GENERAL"),
      ...collectTrackersFromModules(p.modules ?? []),
    ]);
    const deduped = [...new Map(trackers.map((t) => [t.id, t])).values()];
    return workspaceLastUpdatedLabel(projects, deduped);
  }, [projects]);

  if (projectsLoading) {
    return <DashboardHomeSkeleton />;
  }

  const showProjects = view === "all" || view === "projects";
  const showRecentsSidebar =
    view === "all" && recentTrackers.length > 0 && showProjects;

  return (
    <>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <DashboardHomeHeader
          view={view}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onError={setError}
          onCreateProjectClick={
            view !== "recents" ? handleOpenCreateProject : undefined
          }
        />

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <DashboardSummaryMetrics
              projectCount={projects.length}
              trackerCount={totalTrackers}
              lastUpdatedLabel={lastActivityLabel}
            />

            {view === "recents" ? (
              <div className="mt-8">
                <DashboardRecentsSection
                  variant="page"
                  trackers={recentTrackers}
                  selectedIds={recentsMarquee.selectedIds}
                  rootProps={recentsMarquee.rootProps}
                />
              </div>
            ) : showRecentsSidebar ? (
              <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(260px,320px)] lg:items-start">
                <section className="min-w-0">
                  <h2 className="mb-3 text-sm font-semibold tracking-tight">
                    Projects
                  </h2>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="relative"
                    {...projectsMarquee.rootProps}
                  >
                    {viewMode === "grid" ? (
                      <DashboardProjectGrid
                        projects={projects}
                        selectedIds={projectsMarquee.selectedIds}
                        creating={creating}
                        onNewProject={handleOpenCreateProject}
                      />
                    ) : (
                      <DashboardProjectList
                        projects={projects}
                        selectedIds={projectsMarquee.selectedIds}
                        creating={creating}
                        onNewProject={handleOpenCreateProject}
                      />
                    )}
                  </motion.div>
                </section>
                <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DashboardRecentsSection
                      variant="sidebar"
                      trackers={recentTrackers}
                      selectedIds={recentsMarquee.selectedIds}
                      rootProps={recentsMarquee.rootProps}
                    />
                  </motion.div>
                </aside>
              </div>
            ) : (
              <section className="mt-8 min-w-0">
                <h2 className="mb-3 text-sm font-semibold tracking-tight">
                  Projects
                </h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={cn("relative", view === "projects" && "h-full")}
                  {...projectsMarquee.rootProps}
                >
                  {viewMode === "grid" ? (
                    <DashboardProjectGrid
                      projects={projects}
                      selectedIds={projectsMarquee.selectedIds}
                      creating={creating}
                      onNewProject={handleOpenCreateProject}
                    />
                  ) : (
                    <DashboardProjectList
                      projects={projects}
                      selectedIds={projectsMarquee.selectedIds}
                      creating={creating}
                      onNewProject={handleOpenCreateProject}
                    />
                  )}
                </motion.div>
              </section>
            )}
          </div>
        </div>
      </main>

      {projectsMarquee.isDragging && projectsMarquee.dragRect && (
        <MarqueeSelectionOverlay rect={projectsMarquee.dragRect} />
      )}
      {recentsMarquee.isDragging && recentsMarquee.dragRect && (
        <MarqueeSelectionOverlay rect={recentsMarquee.dragRect} />
      )}

      <div
        className={cn(
          "flex h-7 shrink-0 items-center justify-between border-t bg-muted/20 px-4 text-[10px] text-muted-foreground sm:px-6",
          theme.uiChrome.border,
        )}
      >
        <span>
          {projects.length} projects · {totalTrackers} trackers
        </span>
        <span className="tabular-nums">
          {currentTime.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent
          showCloseButton={true}
          className={cn(
            "gap-0 overflow-hidden bg-background/95 p-0 backdrop-blur-sm sm:max-w-[380px]",
            theme.radius.md,
            theme.patterns.floatingChrome,
          )}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-4 pb-4 pl-6 pr-12 pt-6">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center border border-primary/10 bg-primary/10 text-primary",
                  theme.radius.md,
                )}
              >
                <FolderPlus className="h-5 w-5" />
              </div>
              <DialogHeader className="min-w-0 gap-1 p-0 text-left">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  New project
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground/90">
                  Give your project a name. You can rename it anytime.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-2 px-6 pb-6">
              <label
                htmlFor="create-project-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Project name
              </label>
              <Input
                id="create-project-name"
                ref={createProjectInputRef}
                placeholder="e.g. Marketing site"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={handleCreateProjectKeyDown}
                className={cn(
                  "h-10 bg-muted/30 transition-colors placeholder:text-muted-foreground/60 focus:bg-background",
                  theme.radius.md,
                  theme.border.emphasis,
                )}
              />
            </div>
            <DialogFooter
              className={cn(
                "flex-row justify-end gap-2 border-t bg-muted/20 px-6 py-4",
                theme.border.subtleAlt,
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-sm"
                onClick={() => setCreateProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-w-[72px] rounded-sm"
                onClick={() => handleCreateProject()}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed bottom-10 right-6 z-50 flex items-center gap-2 border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive",
            theme.radius.md,
          )}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-sm p-0.5 hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </>
  );
}
