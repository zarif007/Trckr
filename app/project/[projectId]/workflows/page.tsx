"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings2,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Activity,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { dashboardQueryKeys } from "@/app/dashboard/query-keys";
import { useDashboard } from "@/app/dashboard/dashboard-context";
import { DashboardPageSkeleton } from "@/app/dashboard/components/skeleton/DashboardPageSkeleton";
import {
  ProjectBreadcrumbNav,
  ProjectEmptyStatePanel,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbCrumbClass,
  projectAreaBreadcrumbLinkClass,
  projectAreaScrollClass,
  projectAreaToolbarClass,
} from "@/app/dashboard/components/project-area";

const STALE_TIME_MS = 60 * 1000;

type WorkflowRecord = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function WorkflowCard({
  workflow,
  projectId,
  onEnableChange,
}: {
  workflow: WorkflowRecord;
  projectId: string;
  onEnableChange: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPending(true);
    try {
      await onEnableChange(workflow.id, !workflow.enabled);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Link
      href={`/project/${projectId}/workflows/${workflow.id}`}
      className={cn(
        "block rounded-sm border bg-card p-4 hover:border-ring transition-all duration-150 no-underline",
        theme.radius.md,
        theme.border.verySubtle,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/60">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate no-underline">
              {workflow.name}
            </h3>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-sm p-1 transition-colors",
                workflow.enabled
                  ? "text-success hover:bg-success/10"
                  : "text-muted-foreground/40 hover:text-muted-foreground/70",
              )}
              title={workflow.enabled ? "Disable workflow" : "Enable workflow"}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : workflow.enabled ? (
                <Power className="h-3.5 w-3.5" />
              ) : (
                <PowerOff className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {workflow.description ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-snug">
              {workflow.description}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {workflow.enabled ? "Active" : "Disabled"}
            </span>
            <span>{formatDate(workflow.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function WorkflowsListPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { fetchProjects } = useDashboard();
  const projectId = params.projectId as string;

  const { data, isLoading } = useQuery({
    queryKey: [...dashboardQueryKeys.all, "workflows", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows?projectId=${projectId}`);
      if (!res.ok) return [];
      return res.json() as Promise<WorkflowRecord[]>;
    },
    staleTime: STALE_TIME_MS,
  });

  const handleEnableChange = useCallback(
    async (id: string, enabled: boolean) => {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({
          queryKey: [...dashboardQueryKeys.all, "workflows", projectId],
        });
        fetchProjects();
      }
    },
    [projectId, queryClient, fetchProjects],
  );

  const workflows = data ?? [];

  if (isLoading && !workflows.length) {
    return <DashboardPageSkeleton breadcrumbCount={3} />;
  }

  return (
    <main className="flex h-full min-h-0 w-full flex-col">
      <div className={projectAreaToolbarClass}>
        <ProjectBreadcrumbNav>
          <Link
            href="/dashboard"
            className={projectAreaBreadcrumbLinkClass}
          >
            Dashboard
          </Link>
          <ChevronRight
            className={projectAreaBreadcrumbChevronClass}
            aria-hidden
          />
          <Link
            href={`/project/${projectId}`}
            className={projectAreaBreadcrumbLinkClass}
          >
            Project
          </Link>
          <ChevronRight
            className={projectAreaBreadcrumbChevronClass}
            aria-hidden
          />
          <span className={projectAreaBreadcrumbCrumbClass}>Workflows</span>
        </ProjectBreadcrumbNav>
        <Button
          size="sm"
          className={cn("gap-1.5", theme.radius.sm)}
          asChild
        >
          <Link href={`/project/${projectId}/workflows/new`}>
            <Plus className="h-3.5 w-3.5" />
            New workflow
          </Link>
        </Button>
      </div>

      <div className={cn(projectAreaScrollClass)}>
        {workflows.length === 0 ? (
          <ProjectEmptyStatePanel
            icon={Settings2}
            title="No workflows yet"
            description="Create a workflow to automate actions across your trackers."
          >
            <Button
              size="sm"
              className={cn("gap-1.5", theme.radius.sm)}
              asChild
            >
              <Link href={`/project/${projectId}/workflows/new`}>
                <Plus className="h-3.5 w-3.5" />
                Create workflow
              </Link>
            </Button>
          </ProjectEmptyStatePanel>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                projectId={projectId}
                onEnableChange={handleEnableChange}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
