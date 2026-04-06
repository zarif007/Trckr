"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, AlertCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ProjectBreadcrumbNav,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbCrumbClass,
  projectAreaBreadcrumbLinkClass,
  projectAreaScrollClass,
  projectAreaToolbarClass,
} from "@/app/dashboard/components/project-area";
import { useDashboard } from "@/app/dashboard/dashboard-context";
import type { WorkflowSchema } from "@/lib/workflows/types";
import { WorkflowBuilder } from "@/app/components/workflow-builder/workflow-builder";
import { WorkflowErrorBoundary } from "@/app/components/workflow-builder/workflow-error-boundary";
import {
  extractTrackersFromProject,
  flattenTrackerFields,
  type TrackerMetadata,
} from "@/lib/workflows/metadata";

const STALE_TIME_MS = 60 * 1000;

export default function WorkflowBuilderPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const workflowId = params.id as string;

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    staleTime: STALE_TIME_MS,
  });

  const workflowQuery = useQuery<WorkflowRecord>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      return res.json() as Promise<WorkflowRecord>;
    },
    staleTime: STALE_TIME_MS,
  });

  if (workflowQuery.isLoading) {
    return (
      <main className="flex h-full min-h-0 w-full flex-col">
        <div className={projectAreaToolbarClass} />
        <div className={cn(projectAreaScrollClass, "flex items-center justify-center")}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (workflowQuery.error) {
    return (
      <main className="flex h-full min-h-0 w-full flex-col">
        <div className={projectAreaToolbarClass} />
        <div className={cn(projectAreaScrollClass, "flex items-center justify-center")}>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Failed to load workflow</span>
          </div>
        </div>
      </main>
    );
  }

  const workflow = workflowQuery.data!;
  const schema = (workflow.schema as WorkflowSchema) ?? { version: 1, nodes: [], edges: [] };

  const availableTrackers: TrackerMetadata[] = project
    ? extractTrackersFromProject(project)
    : [];

  return (
    <WorkflowBuilderPageContent
      projectId={projectId}
      workflowId={workflowId}
      workflowName={workflow.name}
      initialSchema={schema}
      availableTrackers={availableTrackers}
    />
  );
}

type WorkflowRecord = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  schema: object;
  createdAt: string;
  updatedAt: string;
};

function WorkflowBuilderPageContent({
  projectId,
  workflowId,
  workflowName,
  initialSchema,
  availableTrackers,
}: {
  projectId: string;
  workflowId: string;
  workflowName: string;
  initialSchema: WorkflowSchema;
  availableTrackers: TrackerMetadata[];
}) {
  const queryClient = useQueryClient();
  const { fetchProjects } = useDashboard();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentTrackerFields = useMemo(
    () => flattenTrackerFields(availableTrackers),
    [availableTrackers]
  );

  const handleSave = useCallback(
    async (schema: WorkflowSchema) => {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(`/api/workflows/${workflowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schema }),
        });
        if (!res.ok) {
          setSaveError("Failed to save workflow");
          return;
        }
        fetchProjects();
        queryClient.invalidateQueries({
          queryKey: ["workflow", workflowId],
        });
      } catch {
        setSaveError("Failed to save workflow");
      } finally {
        setSaving(false);
      }
    },
    [workflowId, fetchProjects, queryClient],
  );

  return (
    <main className="flex h-full min-h-0 w-full flex-col">
      <div className={cn(projectAreaToolbarClass, "h-auto py-3")}>
        <div className="flex items-center justify-between w-full">
          <ProjectBreadcrumbNav>
            <Link href="/dashboard" className={projectAreaBreadcrumbLinkClass}>
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
            <Link
              href={`/project/${projectId}/workflows`}
              className={projectAreaBreadcrumbLinkClass}
            >
              Workflows
            </Link>
            <ChevronRight
              className={projectAreaBreadcrumbChevronClass}
              aria-hidden
            />
            <span className={projectAreaBreadcrumbCrumbClass}>{workflowName}</span>
          </ProjectBreadcrumbNav>

          <Link href={`/project/${projectId}/workflows/${workflowId}/runs`}>
            <Button size="sm" variant="outline">
              <History className="h-4 w-4 mr-2" />
              View Runs
            </Button>
          </Link>
        </div>
      </div>

      <div className={cn(projectAreaScrollClass, "!px-0")}>
        <WorkflowErrorBoundary>
          <WorkflowBuilder
            initialSchema={initialSchema}
            workflowId={workflowId}
            onSave={handleSave}
            availableTrackers={availableTrackers}
            currentTrackerFields={currentTrackerFields}
            saving={saving}
            saveError={saveError}
          />
        </WorkflowErrorBoundary>
      </div>
    </main>
  );
}
