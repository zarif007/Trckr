"use client";

import Link from "next/link";
import { LayoutGrid, List, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { DashboardView } from "../../dashboard-view";
import { CreateDropdown } from "../CreateDropdown";

const VIEW_COPY: Record<
  DashboardView,
  { title: string; subtitle: string }
> = {
  all: {
    title: "Overview",
    subtitle: "Your workspace, projects, and recent activity.",
  },
  projects: {
    title: "Projects",
    subtitle: "Open a folder to work with trackers, analyses, and modules.",
  },
  recents: {
    title: "Recent trackers",
    subtitle: "Jump back into tables and lists you edited recently.",
  },
};

type DashboardHomeHeaderProps = {
  view: DashboardView;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onError: (message: string) => void;
  onCreateProjectClick?: () => void;
};

export function DashboardHomeHeader({
  view,
  viewMode,
  onViewModeChange,
  onError,
  onCreateProjectClick,
}: DashboardHomeHeaderProps) {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];
  const { title, subtitle } = VIEW_COPY[view];
  const resolvedSubtitle =
    view === "all" && firstName
      ? `Welcome back, ${firstName}. ${VIEW_COPY.all.subtitle}`
      : subtitle;

  return (
    <header
      className={cn(
        "shrink-0 border-b bg-background/95 px-4 py-5 sm:px-6",
        theme.uiChrome.border,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {resolvedSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {view !== "recents" && (
            <div
              className={cn(
                "flex rounded-sm border p-0.5",
                theme.uiChrome.border,
                "bg-muted/30",
              )}
              role="group"
              aria-label="Layout"
            >
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={cn(
                  "rounded-sm border border-transparent px-2 py-1.5 transition-colors",
                  viewMode === "grid"
                    ? cn("bg-background text-foreground", theme.uiChrome.border)
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={cn(
                  "rounded-sm border border-transparent px-2 py-1.5 transition-colors",
                  viewMode === "list"
                    ? cn("bg-background text-foreground", theme.uiChrome.border)
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          <Link href="/dashboard/ai-project" className="group relative rounded-sm">
            <span className="absolute -inset-0.5 rounded-sm ai-gradient-border opacity-80 transition-opacity group-hover:opacity-100" />
            <span
              className={cn(
                "relative flex h-9 items-center gap-1.5 rounded-sm border bg-background/90 px-3 text-xs font-semibold text-foreground/90 transition-colors group-hover:text-foreground",
                theme.uiChrome.border,
              )}
            >
              <Sparkles
                className="h-3.5 w-3.5 text-foreground/80 group-hover:text-foreground"
                aria-hidden
              />
              AI Project (Alpha)
            </span>
          </Link>
          <CreateDropdown
            variant="toolbar"
            onError={onError}
            onCreateProjectClick={onCreateProjectClick}
          />
        </div>
      </div>
    </header>
  );
}
