'use client'

import { Button } from '@/components/ui/button'

export function TrackerPageMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-wrap items-center justify-center gap-3 pt-20 px-4">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        Back
      </Button>
    </div>
  )
}
