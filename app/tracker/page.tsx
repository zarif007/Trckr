'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
export { TrackerAIView } from './views'
export type { TrackerEditorViewProps } from './views'

function TrackerPageContent() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center pt-24">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  )
}

export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen font-sans bg-background text-foreground flex flex-col pt-24 md:pt-40" />
      }
    >
      <TrackerPageContent />
    </Suspense>
  )
}
