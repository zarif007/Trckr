import { redirect } from 'next/navigation'
import { getModuleAndProjectNameForUser } from '@/lib/dashboard-data'
import { ModuleConfigsContent } from '../../../../../dashboard/components/configs/ModuleConfigsContent'

export default async function ProjectModuleConfigsPage({
  params,
}: {
  params: Promise<{ projectId: string; moduleId: string }>
}) {
  const { projectId, moduleId } = await params
  const data = await getModuleAndProjectNameForUser(moduleId, projectId)
  if (!data) {
    redirect(`/project/${projectId}`)
  }
  return (
    <ModuleConfigsContent
      initialModule={data.module}
      initialProjectName={data.projectName}
      initialBreadcrumb={data.breadcrumb}
    />
  )
}

