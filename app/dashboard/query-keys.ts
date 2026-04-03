export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  projects: () => [...dashboardQueryKeys.all, "projects"] as const,
  project: (id: string) => [...dashboardQueryKeys.all, "project", id] as const,
  module: (id: string) => [...dashboardQueryKeys.all, "module", id] as const,
};
