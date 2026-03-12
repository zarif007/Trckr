'use client'

import dynamic from 'next/dynamic'
import { DashboardHomeSkeleton } from '../dashboard/components/skeleton/DashboardPageSkeleton'

const DashboardPageContent = dynamic(
  () =>
    import('../dashboard/DashboardPageContent').then((m) => ({
      default: m.DashboardPageContent,
    })),
  {
    loading: () => <DashboardHomeSkeleton />,
  },
)

export default function ProjectIndexPage() {
  return <DashboardPageContent view="projects" />
}

