"use client";

import Link from "next/link";
import { ExternalLink, LayoutList, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { TrackerSchema } from "../../dashboard-context";
import type { MarqueeSelectionRootProps } from "../../hooks/useMarqueeSelection";
import {
  DASH_LIST_ICON,
  DASH_LIST_ICON_SHELL,
  dashboardListRowClassName,
} from "./dashboard-marquee-styles";
import { getTrackerDisplayName } from "./tracker-display-name";

type DashboardRecentsSectionProps = {
  trackers: TrackerSchema[];
  selectedIds: ReadonlySet<string>;
  rootProps: MarqueeSelectionRootProps;
  variant: "sidebar" | "page";
};

export function DashboardRecentsSection({
  trackers,
  selectedIds,
  rootProps,
  variant,
}: DashboardRecentsSectionProps) {
  const isPage = variant === "page";

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-sm border bg-card",
        theme.uiChrome.border,
        isPage ? "min-h-[12rem] p-4 sm:p-5" : "p-4",
      )}
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent trackers
      </h2>
      {trackers.length === 0 ? (
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center rounded-sm border border-dashed bg-muted/15 px-4 py-10 text-center",
            theme.uiChrome.border,
          )}
        >
          <Table2
            className="mb-2 h-8 w-8 text-muted-foreground/40"
            aria-hidden
          />
          <p className="text-sm font-medium text-muted-foreground">
            No trackers yet
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/85">
            Open a project and create a tracker to see it here.
          </p>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-col gap-1.5" {...rootProps}>
          {trackers.map((tracker) => {
            const isListView = tracker.listForSchemaId != null;
            const TrackerIcon = isListView ? LayoutList : Table2;
            const href = tracker.listForSchemaId
              ? `/tracker-list/${tracker.id}`
              : `/tracker/${tracker.id}`;
            const tid = `tracker:${tracker.id}`;
            const isSelected = selectedIds.has(tid);
            return (
              <Link
                key={tracker.id}
                href={href}
                data-marquee-selectable
                data-marquee-id={tid}
                aria-selected={isSelected}
                role="option"
                className={dashboardListRowClassName(isSelected)}
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {getTrackerDisplayName(
                      tracker.name,
                      tracker.listForSchemaId != null,
                    )}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Updated{" "}
                    {new Date(tracker.updatedAt).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
                <div
                  className={cn(
                    DASH_LIST_ICON_SHELL,
                    isListView && "border-primary/35 bg-primary/8",
                  )}
                >
                  <TrackerIcon
                    className={cn(
                      DASH_LIST_ICON,
                      isListView && "text-primary/80",
                    )}
                  />
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
