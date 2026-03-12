import { redirect } from 'next/navigation'
export default async function DashboardProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  redirect(`/project/${projectId}`)
}
