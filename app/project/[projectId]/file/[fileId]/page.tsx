import { redirect } from 'next/navigation'
import { getProjectForUser } from '@/lib/dashboard-data'

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
    const tracker = (initialProject.trackerSchemas ?? []).find(
        (t) => t.id === fileId,
    )
    if (!tracker) {
        redirect(`/project/${projectId}`)
    }
    redirect(`/tracker/${tracker.id}/edit`)
}
