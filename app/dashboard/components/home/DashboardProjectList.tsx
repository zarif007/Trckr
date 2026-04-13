"use client";

import Link from "next/link";
import { FolderOpen, FolderPlus, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { Project } from "../../dashboard-context";
import {
  DASH_LIST_ICON,
  DASH_LIST_ICON_SHELL,
  dashboardListRowClassName,
} from "./dashboard-marquee-styles";

type DashboardProjectListProps = {
  projects: Project[];
  selectedIds: ReadonlySet<string>;
  creating: boolean;
  onNewProject: () => void;
};

function projectRootTrackerCount(project: Project): number {
  return (project.trackerSchemas ?? []).filter((t) => t.type === "GENERAL")
    .length;
}

export function DashboardProjectList({
  projects,
  selectedIds,
  creating,
  onNewProject,
}: DashboardProjectListProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {projects.length === 0 && (
        <div
          className={cn(
            "rounded-sm border border-dashed bg-muted/20 px-4 py-8 text-center",
            theme.uiChrome.border,
          )}
        >
          <p className="text-sm font-medium text-foreground">
            No projects yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Create your first project using the row below or the Create menu.
          </p>
        </div>
      )}
      {projects.map((project) => {
        const projectTrackerCount = projectRootTrackerCount(project);
        const pid = `project:${project.id}`;
        const isSelected = selectedIds.has(pid);
        return (
          <Link
            key={project.id}
            href={`/project/${project.id}`}
            data-marquee-selectable
            data-marquee-id={pid}
            aria-selected={isSelected}
            role="option"
            className={dashboardListRowClassName(isSelected)}
          >
            <div className={DASH_LIST_ICON_SHELL}>
              <FolderOpen className={DASH_LIST_ICON} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {project.name || "Untitled project"}
              </span>
              <span className="text-xs text-muted-foreground">
                {projectTrackerCount}{" "}
                {projectTrackerCount === 1 ? "tracker" : "trackers"}
              </span>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {new Date(project.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
      <button
        type="button"
        data-marquee-ignore
        onClick={onNewProject}
        className={cn(
          "flex items-center gap-3 rounded-sm border border-dashed bg-muted/15 px-3 py-2.5 text-left text-muted-foreground transition-colors duration-150",
          theme.uiChrome.border,
          "hover:bg-muted/30 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-dashed bg-muted/25",
            theme.uiChrome.border,
          )}
        >
          {creating ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
          ) : (
            <FolderPlus className="h-5 w-5" />
          )}
        </div>
        <span className="text-sm font-medium">New project</span>
      </button>
    </div>
  );
}
