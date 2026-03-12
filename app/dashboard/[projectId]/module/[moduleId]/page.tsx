import { redirect } from 'next/navigation'
export default async function DashboardModulePage({
  params,
}: {
  params: Promise<{ projectId: string; moduleId: string }>
}) {
  const { projectId, moduleId } = await params
  redirect(`/project/${projectId}/module/${moduleId}`)
}
