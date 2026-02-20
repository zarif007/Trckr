import TrackerNavBar from '@/app/components/TrackerNavBar'

export default function TrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TrackerNavBar />
      {children}
    </>
  )
}
