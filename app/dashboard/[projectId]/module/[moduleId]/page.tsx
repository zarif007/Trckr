import { redirect } from 'next/navigation'
import { getModuleAndProjectNameForUser } from '@/lib/dashboard-data'
import { ModuleContent } from '../../../components/module/ModuleContent'

export default async function DashboardModulePage({
  params,
}: {
  params: Promise<{ projectId: string; moduleId: string }>
}) {
  const { projectId, moduleId } = await params
  const data = await getModuleAndProjectNameForUser(moduleId, projectId)
  if (!data) {
    redirect(`/dashboard/${projectId}`)
  }
  return (
    <ModuleContent
      initialModule={data.module}
      initialProjectName={data.projectName}
    />
  )
}
