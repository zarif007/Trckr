import { redirect } from 'next/navigation'
import { getProjectForUser } from '@/lib/dashboard-data'
import { ProjectFileContent } from '../../../../dashboard/components/file/ProjectFileContent'

export default async function ProjectFilePage({
  params,
}: {
  params: Promise<{ projectId: string; fileId: string }>
}) {
  const { projectId, fileId } = await params
  const initialProject = await getProjectForUser(projectId)
  if (!initialProject) {
    redirect('/project')
  }
  const files = initialProject.projectFiles ?? []
  const file = files.find((f) => f.id === fileId)
  if (!file) {
    redirect(`/project/${projectId}`)
  }
  return (
    <ProjectFileContent
      initialProject={initialProject}
      fileId={fileId}
      fileType={file.type}
    />
  )
}

