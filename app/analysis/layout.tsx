import LogLoginEffect from '@/app/components/LogLoginEffect'

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LogLoginEffect />
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </>
  )
}
