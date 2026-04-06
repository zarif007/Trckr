"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ChevronRight,
  PlayCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  ProjectBreadcrumbNav,
  projectAreaBreadcrumbLinkClass,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbCrumbClass,
  projectAreaToolbarClass,
  projectAreaScrollClass,
} from "@/app/dashboard/components/project-area";

export default function WorkflowRunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const workflowId = params.id as string;

  const runsQuery = useQuery({
    queryKey: ["workflow-runs", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/runs`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json() as Promise<WorkflowRun[]>;
    },
    refetchInterval: 5000, // Poll every 5s for live updates
  });

  const workflowQuery = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      return res.json() as Promise<{ name: string }>;
    },
  });

  return (
    <main className="flex h-full min-h-0 w-full flex-col">
      <div className={cn(projectAreaToolbarClass, "h-auto py-3")}>
        <div className="flex items-center justify-between w-full">
          <ProjectBreadcrumbNav>
            <Link href="/dashboard" className={projectAreaBreadcrumbLinkClass}>
              Dashboard
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} />
            <Link
              href={`/project/${projectId}`}
              className={projectAreaBreadcrumbLinkClass}
            >
              Project
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} />
            <Link
              href={`/project/${projectId}/workflows`}
              className={projectAreaBreadcrumbLinkClass}
            >
              Workflows
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} />
            <Link
              href={`/project/${projectId}/workflows/${workflowId}`}
              className={projectAreaBreadcrumbLinkClass}
            >
              {workflowQuery.data?.name || "Workflow"}
            </Link>
            <ChevronRight className={projectAreaBreadcrumbChevronClass} />
            <span className={projectAreaBreadcrumbCrumbClass}>Runs</span>
          </ProjectBreadcrumbNav>

          <Button size="sm" variant="default">
            <PlayCircle className="h-4 w-4 mr-2" />
            Manual Trigger
          </Button>
        </div>
      </div>

      <div className={projectAreaScrollClass}>
        {runsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : runsQuery.error ? (
          <div className="text-destructive text-sm">Failed to load runs</div>
        ) : runsQuery.data?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No workflow runs yet</p>
            <p className="text-xs mt-2">
              Trigger this workflow manually or wait for automatic triggers
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runsQuery.data?.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RunCard({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        theme.surface.card,
        theme.border.default,
        theme.radius.md,
        "p-4"
      )}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <RunStatusIcon status={run.status} />
          <div>
            <div className="text-sm font-medium capitalize">{run.status}</div>
            <div className="text-xs text-muted-foreground">
              {run.startedAt && new Date(run.startedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </div>

      {run.error && (
        <div className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded">
          {run.error}
        </div>
      )}

      {expanded && run.steps && run.steps.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-4">
          {run.steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      )}

      {expanded && (!run.steps || run.steps.length === 0) && (
        <div className="mt-4 text-xs text-muted-foreground border-t pt-4">
          No steps recorded
        </div>
      )}
    </div>
  );
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "running":
      return <Loader2 className="h-5 w-5 animate-spin text-info" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function StepCard({ step }: { step: WorkflowRunStep }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="text-xs">
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-2 rounded"
        onClick={() => setShowDetails(!showDetails)}
      >
        <RunStatusIcon status={step.status} />
        <span className="font-medium">{step.nodeId}</span>
        {step.error && (
          <span className="ml-auto text-destructive">Error</span>
        )}
      </div>
      {step.error && (
        <div className="mt-1 text-destructive ml-7 p-2 bg-destructive/10 rounded">
          {step.error}
        </div>
      )}
      {showDetails &&
        (step.inputData != null || step.outputData != null) && (
        <div className="mt-2 ml-7 space-y-2">
          {step.inputData != null && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">
                Input Data
              </summary>
              <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
                {JSON.stringify(step.inputData, null, 2)}
              </pre>
            </details>
          )}
          {step.outputData != null && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">
                Output Data
              </summary>
              <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto">
                {JSON.stringify(step.outputData, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  steps?: WorkflowRunStep[];
}

interface WorkflowRunStep {
  id: string;
  nodeId: string;
  status: string;
  error: string | null;
  inputData?: unknown;
  outputData?: unknown;
}
