import { redirect } from 'next/navigation'
import { getProjectForUser } from '@/lib/dashboard-data'
import { ProjectConfigsContent } from '../../../dashboard/components/configs/ProjectConfigsContent'

export default async function ProjectConfigsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const initialProject = await getProjectForUser(projectId)
  if (!initialProject) {
    redirect('/dashboard')
  }
  return <ProjectConfigsContent initialProject={initialProject} />
}

