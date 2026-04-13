/**
 * Skeleton for the main dashboard (project list) page.
 * Shown when navigating to /dashboard or while projects are loading.
 */
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

export function DashboardHomeSkeleton() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background animate-in fade-in-50 duration-150">
      <header
        className={cn(
          "shrink-0 border-b px-4 py-5 sm:px-6",
          theme.uiChrome.border,
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <span className="block h-7 w-48 max-w-full rounded-sm bg-muted/60 animate-pulse sm:h-8 sm:w-56" />
            <span className="block h-4 w-full max-w-md rounded-sm bg-muted/45 animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="h-9 w-[7.5rem] rounded-sm bg-muted/50 animate-pulse" />
            <span className="h-9 w-28 rounded-sm bg-muted/50 animate-pulse" />
            <span className="h-9 w-24 rounded-sm bg-muted/50 animate-pulse" />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 rounded-sm border bg-card/80 px-4 py-3",
                  theme.uiChrome.border,
                )}
              >
                <span className="h-10 w-10 shrink-0 rounded-sm bg-muted/50 animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <span className="block h-3 w-20 rounded-sm bg-muted/45 animate-pulse" />
                  <span className="block h-6 w-16 rounded-sm bg-muted/55 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(260px,320px)]">
            <div className="min-w-0 space-y-3">
              <span className="block h-4 w-24 rounded-sm bg-muted/55 animate-pulse" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex min-h-[4.5rem] flex-row items-center gap-4 rounded-sm border bg-card/70 p-4",
                      theme.uiChrome.border,
                    )}
                  >
                    <span className="h-12 w-12 shrink-0 rounded-sm bg-muted/50 animate-pulse" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="block h-4 w-[75%] max-w-[12rem] rounded-sm bg-muted/55 animate-pulse" />
                      <span className="block h-3 w-28 rounded-sm bg-muted/40 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <span className="block h-3 w-28 rounded-sm bg-muted/45 animate-pulse" />
              <div
                className={cn(
                  "space-y-2 rounded-sm border bg-card/70 p-4",
                  theme.uiChrome.border,
                )}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-sm border px-3 py-2.5",
                      theme.uiChrome.border,
                    )}
                  >
                    <span className="h-11 w-11 shrink-0 rounded-sm bg-muted/45 animate-pulse" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <span className="block h-3.5 w-full max-w-[10rem] rounded-sm bg-muted/50 animate-pulse" />
                      <span className="block h-3 w-20 rounded-sm bg-muted/40 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex h-7 shrink-0 items-center justify-between border-t bg-muted/20 px-4 sm:px-6",
          theme.uiChrome.border,
        )}
      >
        <span className="h-3 w-32 rounded-sm bg-muted/40 animate-pulse" />
        <span className="h-3 w-24 rounded-sm bg-muted/40 animate-pulse" />
      </div>
    </main>
  );
}

/**
 * Skeleton shown during navigation to project, module, or file pages.
 * Matches the layout: breadcrumb bar, grid of items, footer.
 */
export function DashboardPageSkeleton({
  breadcrumbCount = 2,
}: {
  /** 2 = project (Dashboard > Name), 3 = module/file (Dashboard > Project > Name) */
  breadcrumbCount?: 2 | 3;
}) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col animate-in fade-in-50 duration-150">
      {/* Top bar */}
      <div
        className={cn(
          "flex h-10 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-3",
          theme.uiChrome.border,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-12 rounded-sm bg-muted/60" />
          {breadcrumbCount >= 2 && (
            <>
              <span className="h-3 w-3 shrink-0 rounded-full bg-muted/40" />
              <span className="h-3 w-24 rounded-sm bg-muted/60" />
            </>
          )}
          {breadcrumbCount >= 3 && (
            <>
              <span className="h-3 w-3 shrink-0 rounded-full bg-muted/40" />
              <span className="h-3 w-20 rounded-sm bg-muted/70" />
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-7 w-20 rounded-sm bg-muted/50" />
          <span className="h-7 w-24 rounded-sm bg-muted/50" />
        </div>
      </div>

      {/* Content: grid card placeholders (matches project/module tile layout) */}
      <div className="min-h-0 flex-1 overflow-auto px-3 py-6 sm:px-4">
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] content-start gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex min-w-0 w-full animate-pulse flex-col items-center gap-2.5"
            >
              <span className="h-12 w-12 rounded-sm bg-muted/50" />
              <span className="h-3 w-14 rounded-sm bg-muted/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "flex h-6 shrink-0 items-center justify-between border-t bg-muted/20 px-3",
          theme.uiChrome.border,
        )}
      >
        <span className="h-3 w-12 rounded-sm bg-muted/40" />
        <span className="h-3 w-20 rounded-sm bg-muted/40" />
      </div>
    </main>
  );
}
