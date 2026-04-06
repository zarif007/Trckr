"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ChevronRight, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  ProjectBreadcrumbNav,
  projectAreaBreadcrumbChevronClass,
  projectAreaBreadcrumbCrumbClass,
  projectAreaBreadcrumbInputClass,
  projectAreaBreadcrumbLinkClass,
  projectAreaScrollClass,
  projectAreaToolbarClass,
} from "@/app/dashboard/components/project-area";
import { useDashboard } from "@/app/dashboard/dashboard-context";

export default function NewWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchProjects } = useDashboard();
  const projectId = params.projectId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: trimmedName,
          description: description.trim() || undefined,
          schema: { version: 1, nodes: [], edges: [] },
        }),
      });
      if (!res.ok) {
        setError("Failed to create workflow");
        return;
      }
      const workflow = await res.json();
      fetchProjects();
      router.push(`/project/${projectId}/workflows/${workflow.id}`);
    } catch {
      setError("Failed to create workflow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex h-full min-h-0 w-full flex-col">
      <div className={cn(projectAreaToolbarClass, "h-auto py-3")}>
        <ProjectBreadcrumbNav className="w-full">
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
          <span className={projectAreaBreadcrumbCrumbClass}>New workflow</span>
        </ProjectBreadcrumbNav>
      </div>

      <div className={cn(projectAreaScrollClass, "flex items-start justify-center pt-24")}>
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted/60">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Create workflow
                </h1>
                <p className="text-sm text-muted-foreground">
                  Set up a name to get started building the workflow.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="workflow-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleCreate();
                }}
                placeholder="e.g. Sync data to external tracker"
                className={projectAreaBreadcrumbInputClass.replace("h-6", "h-9")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="workflow-description"
                className="text-sm font-medium text-foreground"
              >
                Description
                <span className="ml-1 font-normal text-muted-foreground/70">
                  (optional)
                </span>
              </label>
              <Input
                id="workflow-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className={projectAreaBreadcrumbInputClass.replace("h-6", "h-9")}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className={cn("gap-1.5", theme.radius.sm)}
              onClick={handleCreate}
              disabled={!name.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create workflow"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn(theme.radius.sm)}
              asChild
            >
              <Link href={`/project/${projectId}/workflows`}>Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
