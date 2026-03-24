'use client'

import { Check, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import type { GenerationTimelineStep } from '@/app/insights/lib/ndjson-timeline'

type GenerationTimelineProps = {
  steps: GenerationTimelineStep[]
  running: boolean
  /** Map artifact kind (e.g. `query_plan`) to a short “saved” line for the step body. */
  artifactLabels: Record<string, string>
  stepDetailsOpen: Record<number, boolean>
  onStepDetailsOpenChange: (idx: number, open: boolean) => void
}

export function GenerationTimeline({
  steps,
  running,
  artifactLabels,
  stepDetailsOpen,
  onStepDetailsOpenChange,
}: GenerationTimelineProps) {
  if (steps.length === 0) return null

  return (
    <div className="mb-8 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Generation details
      </h2>
      <ol className="space-y-2">
        {steps.map((s, idx) => {
          const isLast = idx === steps.length - 1
          const showSpinner = running && isLast
          const detailsOpen = stepDetailsOpen[idx] ?? false
          const hasBody =
            s.deltas.length > 0 || s.rowCount !== undefined || s.artifactKind !== undefined
          const artifactLine =
            s.artifactKind !== undefined ? artifactLabels[s.artifactKind] : undefined
          return (
            <li
              key={`${s.phase}-${idx}`}
              className={cn(
                'rounded-md border border-border/40 bg-muted/20 text-sm overflow-hidden',
                showSpinner && 'ring-1 ring-primary/20 bg-muted/30',
              )}
            >
              <details
                open={detailsOpen}
                onToggle={(e) => {
                  onStepDetailsOpenChange(idx, e.currentTarget.open)
                }}
              >
                <summary
                  className={cn(
                    'cursor-pointer list-none flex items-start gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden',
                    hasBody ? 'hover:bg-muted/40' : 'cursor-default',
                  )}
                  onClick={(e) => {
                    if (!hasBody) e.preventDefault()
                  }}
                >
                  <ChevronRight
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      detailsOpen && 'rotate-90',
                      !hasBody && 'opacity-0 pointer-events-none',
                    )}
                    aria-hidden
                  />
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {showSpinner ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-emerald-600/80 dark:text-emerald-400/90" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="font-medium text-foreground/90 font-mono text-xs tracking-tight">
                      {s.label ?? s.phase}
                    </div>
                    {s.summary ? (
                      <p className="mt-0.5 text-xs text-muted-foreground font-sans font-normal line-clamp-2">
                        {s.summary}
                      </p>
                    ) : null}
                  </div>
                </summary>
                {hasBody && (
                  <div className="border-t border-border/30 bg-muted/10 px-3 py-2.5 pl-[2.75rem] space-y-2">
                    {s.deltas.length > 0 && (
                      <ul className="space-y-0.5 text-xs text-muted-foreground list-none pl-0 font-mono leading-snug opacity-90">
                        {s.deltas.map((d, i) => (
                          <li key={i} className="border-l-2 border-primary/25 pl-2">
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.rowCount !== undefined && (
                      <p
                        className="text-xs text-muted-foreground"
                        title={
                          s.columns && s.columns.length > 0 ? s.columns.join(', ') : undefined
                        }
                      >
                        Prepared <strong className="font-medium text-foreground/80">{s.rowCount}</strong>{' '}
                        row{s.rowCount === 1 ? '' : 's'}
                        {s.columns && s.columns.length > 0 ? (
                          <span className="text-muted-foreground/70"> · hover for fields</span>
                        ) : null}
                      </p>
                    )}
                    {artifactLine !== undefined && (
                      <p className="text-xs text-primary/90">{artifactLine}</p>
                    )}
                  </div>
                )}
              </details>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function GenerationTimelineStarting({ running, emptySteps }: { running: boolean; emptySteps: boolean }) {
  if (!running || !emptySteps) return null
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
      <Loader2 className="h-4 w-4 animate-spin" />
      Starting…
    </div>
  )
}
