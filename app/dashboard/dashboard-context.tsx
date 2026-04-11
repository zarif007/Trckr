"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardQueryKeys } from "./query-keys";

export type TrackerSchema = {
  id: string;
  name: string | null;
  projectId: string;
  moduleId: string | null;
  type: "GENERAL" | "SYSTEM";
  systemType: SystemFileType | null;
  instance: string;
  versionControl: boolean;
  /** If set, this schema is the ".list" companion for the referenced parent schema (MULTI instance) */
  listForSchemaId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SystemFileType = "TEAMS" | "SETTINGS" | "RULES" | "CONNECTIONS";

export const SYSTEM_FILE_LABELS: Record<SystemFileType, string> = {
  TEAMS: "Teams",
  SETTINGS: "Settings",
  RULES: "Rules",
  CONNECTIONS: "Connections",
};

export type ReportSummary = {
  id: string;
  name: string;
  moduleId: string | null;
  updatedAt: string;
};

export type AnalysisSummary = {
  id: string;
  name: string;
  moduleId: string | null;
  updatedAt: string;
};

export type BoardSummary = {
  id: string;
  name: string;
  moduleId: string | null;
  updatedAt: string;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  moduleId: string | null;
  updatedAt: string;
  createdAt: string;
};

export type Module = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  trackerSchemas: TrackerSchema[];
  children: Module[];
};

export type Project = {
  id: string;
  name: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  trackerSchemas: TrackerSchema[];
  reports: ReportSummary[];
  analyses: AnalysisSummary[];
  boards: BoardSummary[];
  workflows: WorkflowSummary[];
  modules: Module[];
};

export function collectTrackersFromModules(modules: Module[]): TrackerSchema[] {
  return modules.flatMap((m) => [
    ...(m.trackerSchemas ?? []).filter((t) => t.type === "GENERAL"),
    ...collectTrackersFromModules(m.children ?? []),
  ]);
}

type DashboardContextValue = {
  projects: Project[];
  setProjects: (p: Project[] | ((prev: Project[]) => Project[])) => void;
  projectsLoading: boolean;
  fetchProjects: () => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function fetchProjectsApi(): Promise<Project[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) return [];
  return res.json();
}

export function DashboardProvider({
  children,
  initialProjects = null,
}: {
  children: ReactNode;
  initialProjects?: Project[] | null;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isPending: projectsLoading } = useQuery({
    queryKey: dashboardQueryKeys.projects(),
    queryFn: fetchProjectsApi,
    initialData: initialProjects ?? undefined,
    staleTime: 60 * 1000,
  });

  const setProjects = useCallback(
    (updater: Project[] | ((prev: Project[]) => Project[])) => {
      queryClient.setQueryData<Project[]>(
        dashboardQueryKeys.projects(),
        (old) => (typeof updater === "function" ? updater(old ?? []) : updater),
      );
    },
    [queryClient],
  );

  const fetchProjects = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.projects(),
    });
  }, [queryClient]);

  const value = useMemo<DashboardContextValue>(
    () => ({
      projects,
      setProjects,
      projectsLoading,
      fetchProjects,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [projects, projectsLoading, fetchProjects, sidebarCollapsed, setProjects],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
