import { redirect } from 'next/navigation'
export default async function DashboardProjectFilePage({
  params,
}: {
  params: Promise<{ projectId: string; fileId: string }>
}) {
  const { projectId, fileId } = await params
  redirect(`/project/${projectId}/file/${fileId}`)
}
