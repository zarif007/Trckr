import TrackerNavBar from '@/app/components/TrackerNavBar'
import LogLoginEffect from '@/app/components/LogLoginEffect'

export default function TrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LogLoginEffect />
      <TrackerNavBar />
      {children}
    </>
  )
}
