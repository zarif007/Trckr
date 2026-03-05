'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TrackerStatusPanelProps {
  isLoading: boolean
  validationErrors: string[]
  error: Error | undefined
  generationErrorMessage: string | null
  resumingAfterError: boolean
  onContinue: () => void
  messagesLength: number
  hasGeneratedTracker: boolean
  hasAnyAssistantResponse: boolean
}

export function TrackerStatusPanel({
  isLoading,
  validationErrors,
  error,
  generationErrorMessage,
  resumingAfterError,
  onContinue,
  messagesLength,
  hasGeneratedTracker,
  hasAnyAssistantResponse,
}: TrackerStatusPanelProps) {
  const isStreaming = isLoading
  const showNoTracker =
    messagesLength > 0 && !isStreaming && !hasGeneratedTracker && hasAnyAssistantResponse

  return (
    <div className="space-y-3">
      {validationErrors.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border-l-2 border-amber-500/80 bg-amber-500/5 px-4 py-3"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Validation issues</p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground/80 mt-2">Ask the AI to fix these.</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border-l-2 border-red-500/80 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {resumingAfterError ? 'Connection failed' : 'Generation failed'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
              {generationErrorMessage || error.message || 'An error occurred.'}
            </p>
            <Button variant="ghost" size="sm" onClick={onContinue} className="mt-2 h-8 text-xs font-semibold">
              Continue
            </Button>
          </div>
        </div>
      )}

      {showNoTracker && !error && (
        <div className="flex items-start gap-3 rounded-lg border-l-2 border-amber-500/80 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">No tracker generated</p>
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
              {generationErrorMessage || 'The AI responded but did not produce a valid tracker.'}
            </p>
            <Button variant="ghost" size="sm" onClick={onContinue} className="mt-2 h-8 text-xs font-semibold">
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
