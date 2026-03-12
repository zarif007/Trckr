import { getProjectsForUser } from '@/lib/dashboard-data'
import { DashboardLayoutClient } from '../dashboard/components/layout/DashboardLayoutClient'

export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialProjects = await getProjectsForUser()
  return (
    <DashboardLayoutClient initialProjects={initialProjects}>
      {children}
    </DashboardLayoutClient>
  )
}

