import TrackerNavBar from '@/app/components/TrackerNavBar'
import LogLoginEffect from '@/app/components/LogLoginEffect'
import { TrackerNavProvider } from './TrackerNavContext'

export default function TrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TrackerNavProvider>
      <LogLoginEffect />
      <TrackerNavBar />
      {children}
    </TrackerNavProvider>
  )
}
