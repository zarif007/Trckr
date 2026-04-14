"use client";

import Link from "next/link";
import { FolderOpen, FolderPlus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { Project } from "../../dashboard-context";
import {
  DASH_GRID_ICON,
  DASH_GRID_ICON_SHELL,
  MARQUEE_SELECTED,
} from "./dashboard-marquee-styles";

type DashboardProjectGridProps = {
  projects: Project[];
  selectedIds: ReadonlySet<string>;
  creating: boolean;
  onNewProject: () => void;
};

function projectRootTrackerCount(project: Project): number {
  return (project.trackerSchemas ?? []).filter((t) => t.type === "GENERAL")
    .length;
}

export function DashboardProjectGrid({
  projects,
  selectedIds,
  creating,
  onNewProject,
}: DashboardProjectGridProps) {
  return (
    <>
      {projects.length === 0 && (
        <div
          className={cn(
            "mb-4 rounded-sm border border-dashed bg-muted/20 px-4 py-8 text-center",
            theme.uiChrome.border,
          )}
        >
          <p className="text-sm font-medium text-foreground">
            No projects yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Create a project to organize trackers, analyses, and boards. Use the
            card below or the Create menu.
          </p>
        </div>
      )}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              className={cn(
                "block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected && MARQUEE_SELECTED,
              )}
            >
              <motion.div
                whileTap={{ scale: 0.995 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className={cn(
                  "flex h-full min-h-[4.5rem] flex-row items-center gap-4 rounded-sm border bg-card p-4 text-left transition-[border-color,background-color] duration-150",
                  "border",
                  theme.uiChrome.border,
                  theme.uiChrome.hover,
                  "group cursor-pointer hover:bg-muted/35",
                )}
              >
                <div className={DASH_GRID_ICON_SHELL}>
                  <FolderOpen className={DASH_GRID_ICON} />
                  {projectTrackerCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-sm bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {projectTrackerCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">
                    {project.name || "Untitled project"}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {projectTrackerCount}{" "}
                    {projectTrackerCount === 1 ? "tracker" : "trackers"}
                    <span className="text-muted-foreground/60"> · </span>
                    {new Date(project.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year:
                        new Date(project.updatedAt).getFullYear() !==
                        new Date().getFullYear()
                          ? "numeric"
                          : undefined,
                    })}
                  </p>
                </div>
              </motion.div>
            </Link>
          );
        })}
        <motion.div
          whileTap={{ scale: 0.995 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          data-marquee-ignore
          role="button"
          tabIndex={0}
          onClick={onNewProject}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNewProject();
            }
          }}
          className={cn(
            "flex min-h-[4.5rem] cursor-pointer flex-row items-center gap-4 rounded-sm border border-dashed bg-muted/20 p-4 transition-[border-color,background-color] duration-150",
            theme.uiChrome.border,
            "hover:border-primary/40 hover:bg-muted/35",
          )}
        >
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-dashed bg-muted/30",
              theme.uiChrome.border,
            )}
          >
            {creating ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
            ) : (
              <FolderPlus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-muted-foreground">New project</p>
            <p className="mt-0.5 text-xs text-muted-foreground/80">
              Add a workspace folder
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
