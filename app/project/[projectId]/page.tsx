import { redirect } from 'next/navigation'
import { getProjectForUser } from '@/lib/dashboard-data'
import { ProjectContent } from '../../dashboard/components/project/ProjectContent'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const initialProject = await getProjectForUser(projectId)
  if (!initialProject) {
    redirect('/dashboard')
  }
  return <ProjectContent initialProject={initialProject} />
}

