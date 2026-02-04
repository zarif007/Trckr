'use client'

import { Loader2, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { TrackerDisplay } from '@/app/components/tracker-display'
import type { TrackerResponse } from '../hooks/useTrackerChat'

/** Streamed object from useObject – typed loosely to accept PartialObject from AI SDK */
type StreamedObject = { manager?: unknown; tracker?: unknown } | undefined

interface TrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isLoading: boolean
  object: StreamedObject
  activeTrackerData: TrackerResponse | null
  validationErrors: string[]
  error: Error | undefined
  generationErrorMessage: string | null
  resumingAfterError: boolean
  onContinue: () => void
  onClearError: () => void
  trackerDataRef: React.RefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
  messagesLength: number
}

export function TrackerDialog({
  open,
  onOpenChange,
  isLoading,
  object: streamedObject,
  activeTrackerData,
  validationErrors,
  error,
  generationErrorMessage,
  resumingAfterError,
  onContinue,
  onClearError,
  trackerDataRef,
  messagesLength,
}: TrackerDialogProps) {
  const object = streamedObject as { tracker?: { tabs?: unknown[]; sections?: unknown[]; grids?: unknown[]; fields?: unknown[]; layoutNodes?: unknown[]; bindings?: unknown } } | undefined
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      onClearError()
    }
  }

  const tracker = object?.tracker
  const isStreaming = isLoading && !!tracker

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`
          !fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2
          !flex !flex-col !p-0 !gap-0
          !max-w-[min(95vw,80rem)] !w-[min(95vw,80rem)] !h-fit !max-h-[75vh]
          overflow-hidden relative z-50
          bg-background/95 backdrop-blur-2xl
          !border-none
          ${isStreaming ? 'animate-border-blink' : ''}
        `.trim()}
      >
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 right-3 z-50 h-9 w-9 rounded-full shadow-lg opacity-90 hover:opacity-100"
          onClick={() => handleOpenChange(false)}
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex-1 overflow-y-auto min-h-0">
          {isStreaming && tracker ? (
            <TrackerDisplay
              tabs={((tracker.tabs || []) as unknown[]).filter((t): t is TrackerResponse['tabs'][number] => !!t && typeof t === 'object' && 'name' in t && !!(t as { name?: string }).name) as TrackerResponse['tabs']}
              sections={((tracker.sections || []) as unknown[]).filter((s): s is TrackerResponse['sections'][number] => !!s && typeof s === 'object' && 'name' in s && !!(s as { name?: string }).name) as TrackerResponse['sections']}
              grids={((tracker.grids || []) as unknown[]).filter((g): g is TrackerResponse['grids'][number] => !!g && typeof g === 'object' && 'name' in g && !!(g as { name?: string }).name) as TrackerResponse['grids']}
              fields={((tracker.fields || []) as unknown[]).filter((f): f is TrackerResponse['fields'][number] => !!f && typeof f === 'object' && 'ui' in f && !!((f as { ui?: { label?: string } }).ui?.label)) as TrackerResponse['fields']}
              layoutNodes={(tracker.layoutNodes || []) as TrackerResponse['layoutNodes']}
              bindings={(tracker.bindings || {}) as TrackerResponse['bindings']}
              getDataRef={trackerDataRef}
            />
          ) : activeTrackerData ? (
            <div className="w-full">
              {validationErrors.length > 0 && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200" role="alert">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Schema validation issues
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2 text-muted-foreground">You can ask the AI to fix these (e.g. add missing option sources or fix layout references).</p>
                </div>
              )}
              <TrackerDisplay
                tabs={activeTrackerData.tabs}
                sections={activeTrackerData.sections}
                grids={activeTrackerData.grids}
                fields={activeTrackerData.fields}
                layoutNodes={activeTrackerData.layoutNodes}
                bindings={activeTrackerData.bindings}
                getDataRef={trackerDataRef}
              />
            </div>
          ) : error && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="text-center max-w-md space-y-2">
                <p className="font-bold">{resumingAfterError ? 'Connection failed' : 'Generation Failed'}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {generationErrorMessage || error.message || 'An error occurred while generating the tracker.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" onClick={onContinue}>
                  Continue from where it left off
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-6">
              {messagesLength > 0 && !isLoading ? (
                <div className="flex flex-col items-center gap-4 text-amber-500">
                  <div className="p-3 rounded-full bg-amber-500/10">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="text-center max-w-md space-y-2">
                    <p className="font-bold">No Tracker Generated</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {generationErrorMessage || 'The AI responded but did not generate a valid tracker configuration.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" onClick={onContinue}>
                      Continue from where it left off
                    </Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin text-primary relative" />
                  </div>
                  <p className="text-lg font-bold tracking-tight animate-pulse">Initializing Interface...</p>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
