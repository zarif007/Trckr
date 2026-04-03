import LogLoginEffect from '@/app/components/LogLoginEffect'

export default function ReportLayout({ children }: { children: React.ReactNode }) {
 return (
 <>
 <LogLoginEffect />
 <div className="min-h-screen bg-background text-foreground">{children}</div>
 </>
 )
}
