/**
 * Skeleton shown during navigation to project, module, or file pages.
 * Matches the layout: breadcrumb bar, grid of items, footer.
 */
export function DashboardPageSkeleton({
  breadcrumbCount = 2,
}: {
  /** 2 = project (Desktop > Name), 3 = module/file (Desktop > Project > Name) */
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

      {/* Content: grid of card placeholders */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))] max-w-2xl">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2.5 animate-pulse"
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
