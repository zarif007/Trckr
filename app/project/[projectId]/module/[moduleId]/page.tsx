import { redirect } from "next/navigation";
import { getModuleAndProjectNameForUser } from "@/lib/dashboard-data";
import { ModuleContent } from "../../../../dashboard/components/module/ModuleContent";

export default async function ProjectModulePage({
  params,
}: {
  params: Promise<{ projectId: string; moduleId: string }>;
}) {
  const { projectId, moduleId } = await params;
  const data = await getModuleAndProjectNameForUser(moduleId, projectId);
  if (!data) {
    redirect(`/project/${projectId}`);
  }
  return (
    <ModuleContent
      initialModule={data.module}
      initialProjectName={data.projectName}
      initialBreadcrumb={data.breadcrumb}
    />
  );
}
