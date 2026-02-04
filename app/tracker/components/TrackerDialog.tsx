'use client'

import { Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-3xl border-border/50 bg-background/95 backdrop-blur-2xl transition-all">
        <DialogHeader className="p-6 border-b border-border/50 bg-secondary/10 shrink-0">
          <DialogTitle className="flex items-center justify-between gap-3 text-sm md:text-xl font-bold tracking-tight">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-foreground text-background">
                <Sparkles className="w-5 h-5" />
              </div>
              {isLoading && (
                <span className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider animate-pulse border border-primary/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </span>
              )}
            </div>
            {(isLoading && object?.tracker) || activeTrackerData ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = trackerDataRef.current?.()
                  console.log('Tracker data (values):', data ?? {})
                }}
                className="shrink-0"
              >
                See
              </Button>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {(isLoading && object?.tracker) ? (
            <TrackerDisplay
              tabs={((object.tracker.tabs || []) as unknown[]).filter((t): t is TrackerResponse['tabs'][number] => !!t && typeof t === 'object' && 'name' in t && !!(t as { name?: string }).name) as TrackerResponse['tabs']}
              sections={((object.tracker.sections || []) as unknown[]).filter((s): s is TrackerResponse['sections'][number] => !!s && typeof s === 'object' && 'name' in s && !!(s as { name?: string }).name) as TrackerResponse['sections']}
              grids={((object.tracker.grids || []) as unknown[]).filter((g): g is TrackerResponse['grids'][number] => !!g && typeof g === 'object' && 'name' in g && !!(g as { name?: string }).name) as TrackerResponse['grids']}
              fields={((object.tracker.fields || []) as unknown[]).filter((f): f is TrackerResponse['fields'][number] => !!f && typeof f === 'object' && 'ui' in f && !!((f as { ui?: { label?: string } }).ui?.label)) as TrackerResponse['fields']}
              layoutNodes={(object.tracker.layoutNodes || []) as TrackerResponse['layoutNodes']}
              bindings={(object.tracker.bindings || {}) as TrackerResponse['bindings']}
              getDataRef={trackerDataRef}
            />
          ) : activeTrackerData ? (
            <div className="space-y-4 w-full max-w-4xl mx-auto">
              {validationErrors.length > 0 && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200" role="alert">
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
