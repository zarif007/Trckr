"use client";

import { FolderOpen, Table2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

type DashboardSummaryMetricsProps = {
  projectCount: number;
  trackerCount: number;
  lastUpdatedLabel: string | null;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-sm border bg-card px-4 py-3",
        theme.uiChrome.border,
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border bg-muted/40 text-muted-foreground",
          theme.uiChrome.border,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardSummaryMetrics({
  projectCount,
  trackerCount,
  lastUpdatedLabel,
}: DashboardSummaryMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard
        icon={FolderOpen}
        label="Projects"
        value={String(projectCount)}
        hint="Workspace folders"
      />
      <MetricCard
        icon={Table2}
        label="Trackers"
        value={String(trackerCount)}
        hint="Tables & lists"
      />
      <MetricCard
        icon={Clock}
        label="Last activity"
        value={lastUpdatedLabel ?? "—"}
        hint={lastUpdatedLabel ? "Most recent edit" : "No edits yet"}
      />
    </div>
  );
}
