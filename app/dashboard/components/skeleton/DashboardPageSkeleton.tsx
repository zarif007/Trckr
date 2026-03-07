/**
 * Skeleton for the main dashboard (project list) page.
 * Shown when navigating to /dashboard or while projects are loading.
 */
export function DashboardHomeSkeleton() {
  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-background via-background/95 to-background animate-in fade-in-50 duration-150">
      <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="h-7 w-24 rounded-md bg-muted/50 animate-pulse" />
          <span className="h-7 w-24 rounded-md bg-muted/50 animate-pulse" />
          <div className="w-px h-4 bg-border/60" />
          <div className="flex rounded-md border border-border/50 overflow-hidden">
            <span className="h-7 w-7 bg-muted/50 animate-pulse" />
            <span className="h-7 w-7 bg-muted/50 animate-pulse" />
          </div>
        </div>
        <span className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-wrap gap-4 content-start">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[90px] flex-[1_1_90px] max-w-[calc(20%-0.75rem)] flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-background/60 animate-pulse"
            >
              <span className="w-12 h-12 rounded-xl bg-muted/50" />
              <span className="h-3 w-14 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20">
        <span className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
        <span className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
      </div>
    </main>
  )
}

/**
 * Skeleton shown during navigation to project, module, or file pages.
 * Matches the layout: breadcrumb bar, grid of items, footer.
 */
export function DashboardPageSkeleton({
  breadcrumbCount = 2,
}: {
  /** 2 = project (Dashboard > Name), 3 = module/file (Dashboard > Project > Name) */
  breadcrumbCount?: 2 | 3
}) {
  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0 animate-in fade-in-50 duration-150">
      {/* Top bar */}
      <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-3 w-12 rounded bg-muted/60" />
          {breadcrumbCount >= 2 && (
            <>
              <span className="h-3 w-3 rounded-full bg-muted/40 shrink-0" />
              <span className="h-3 w-24 rounded bg-muted/60" />
            </>
          )}
          {breadcrumbCount >= 3 && (
            <>
              <span className="h-3 w-3 rounded-full bg-muted/40 shrink-0" />
              <span className="h-3 w-20 rounded bg-muted/70" />
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-7 w-20 rounded-md bg-muted/50" />
          <span className="h-7 w-24 rounded-md bg-muted/50" />
        </div>
      </div>

      {/* Content: flex wrap card placeholders */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-wrap gap-6 w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2.5 min-w-[6.5rem] flex-[1_1_6.5rem] animate-pulse"
            >
              <span className="w-12 h-12 rounded-2xl bg-muted/50" />
              <span className="h-3 w-14 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 bg-muted/20">
        <span className="h-3 w-12 rounded bg-muted/40" />
        <span className="h-3 w-20 rounded bg-muted/40" />
      </div>
    </main>
  )
}
