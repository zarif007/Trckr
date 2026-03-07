'use client'

import {
  SECTION_BAR_CLASS,
  TAB_CONTENT_ROOT,
  TAB_CONTENT_INNER,
  SECTION_GROUP_ROOT,
  GRIDS_CONTAINER,
} from '@/app/components/tracker-display/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsDesktop } from '@/app/tracker/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      aria-hidden
    />
  )
}

/** Skeleton that mirrors the tracker UI: toolbar, tabs, section bars, and grid/table area. */
export function TrackerPageSkeleton() {
  const isDesktop = useIsDesktop()
  return (
    <>
      {/* Desktop layout — matches TrackerAIView desktop */}
      <div
        className="h-screen box-border font-sans bg-background text-foreground overflow-hidden flex flex-col pt-14 hidden md:flex"
        aria-hidden={!isDesktop}
      >
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <section className="relative h-full bg-background/60 rounded-lg w-full transition-shadow duration-300">
            {/* Toolbar strip — matches TrackerPanel top bar */}
            <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center justify-end gap-1.5 rounded-md border border-border/60 bg-background/90 p-1.5 shadow-sm max-w-[calc(100%-0.5rem)]">
              <div className="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-background/80 p-0.5 gap-1">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-14 rounded-md" />
            </div>

            {/* Content area — matches TrackerPanel: px-4 pt-16 pb-6 then card wrapper like TrackerDisplayInline */}
            <div className="h-full overflow-y-auto px-4 pt-16 pb-6">
              <div className="w-full min-w-0 space-y-6 px-0 py-4 md:p-6 bg-card rounded-md">
                <Tabs defaultValue="tab1" className="w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
                    <TabsList className="h-9 w-fit inline-flex">
                      <Skeleton className="h-8 w-24 rounded-md mx-0.5" />
                      <Skeleton className="h-8 w-20 rounded-md mx-0.5" />
                    </TabsList>
                  </div>
                  <TabsContent value="tab1" className={cn(TAB_CONTENT_ROOT, 'focus-visible:outline-none')}>
                    <div className={TAB_CONTENT_INNER}>
                      {/* Section 1 */}
                      <div className={SECTION_GROUP_ROOT}>
                        <div className={cn(SECTION_BAR_CLASS, 'opacity-80')}>
                          <Skeleton className="h-4 w-4 shrink-0 rounded" />
                          <Skeleton className="h-4 flex-1 max-w-[180px]" />
                        </div>
                        <div className={GRIDS_CONTAINER}>
                          <div className="w-full min-w-0 rounded-lg border border-border/40 overflow-hidden">
                            <div className="flex w-full gap-4 px-4 py-3 border-b border-border/40 bg-muted/30">
                              <Skeleton className="h-4 w-24 shrink-0" />
                              <Skeleton className="h-4 flex-1 min-w-0 max-w-[8rem]" />
                              <Skeleton className="h-4 w-20 shrink-0" />
                            </div>
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="flex w-full gap-4 px-4 py-3 border-b border-border/30 last:border-0"
                              >
                                <Skeleton className="h-4 w-24 shrink-0" />
                                <Skeleton className="h-4 flex-1 min-w-0 max-w-[8rem]" />
                                <Skeleton className="h-4 w-20 shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div className={SECTION_GROUP_ROOT}>
                        <div className={cn(SECTION_BAR_CLASS, 'opacity-80')}>
                          <Skeleton className="h-4 w-4 shrink-0 rounded" />
                          <Skeleton className="h-4 flex-1 max-w-[140px]" />
                        </div>
                        <div className={GRIDS_CONTAINER}>
                          <div className="w-full min-w-0 rounded-lg border border-border/40 overflow-hidden">
                            <div className="flex w-full gap-4 px-4 py-3 border-b border-border/40 bg-muted/30">
                              <Skeleton className="h-4 w-28 shrink-0" />
                              <Skeleton className="h-4 flex-1 min-w-0 max-w-[6rem]" />
                            </div>
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="flex w-full gap-4 px-4 py-3 border-b border-border/30 last:border-0"
                              >
                                <Skeleton className="h-4 w-28 shrink-0" />
                                <Skeleton className="h-4 flex-1 min-w-0 max-w-[6rem]" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile layout — matches TrackerAIView mobile (Preview tab only) */}
      <div
        className="h-screen box-border font-sans bg-background text-foreground overflow-hidden flex flex-col pt-12 md:pt-14 md:hidden"
        aria-hidden={isDesktop}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs defaultValue="preview" className="flex-1 min-h-0 flex flex-col gap-0">
            <div className="shrink-0 px-1 pt-2 pb-2 border-b border-border/60 bg-background/95 backdrop-blur">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="chat" disabled>
                  Chat
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
              <section className="relative h-full bg-background/60 rounded-lg w-full overflow-y-auto px-1 pt-14 pb-2">
                <div className="absolute top-4 right-1 z-20 flex items-center gap-1.5 rounded-md border border-border/60 bg-background/90 p-1.5 shadow-sm max-w-[calc(100%-0.5rem)]">
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <div className="w-full min-w-0 space-y-6 px-0 py-4 bg-card rounded-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <TabsList className="h-9 w-fit inline-flex">
                      <Skeleton className="h-8 w-20 rounded-md mx-0.5" />
                      <Skeleton className="h-8 w-16 rounded-md mx-0.5" />
                    </TabsList>
                  </div>
                  <div className={cn(TAB_CONTENT_ROOT, 'focus-visible:outline-none')}>
                    <div className={TAB_CONTENT_INNER}>
                      <div className={SECTION_GROUP_ROOT}>
                        <div className={cn(SECTION_BAR_CLASS, 'opacity-80')}>
                          <Skeleton className="h-4 w-4 shrink-0 rounded" />
                          <Skeleton className="h-4 flex-1 max-w-[160px]" />
                        </div>
                        <div className={GRIDS_CONTAINER}>
                          <div className="w-full min-w-0 rounded-lg border border-border/40 overflow-hidden">
                            <div className="flex w-full gap-3 px-3 py-2.5 border-b border-border/40 bg-muted/30">
                              <Skeleton className="h-3.5 w-16 shrink-0" />
                              <Skeleton className="h-3.5 flex-1 min-w-0 max-w-[5rem]" />
                            </div>
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="flex w-full gap-3 px-3 py-2.5 border-b border-border/30 last:border-0"
                              >
                                <Skeleton className="h-3.5 w-16 shrink-0" />
                                <Skeleton className="h-3.5 flex-1 min-w-0 max-w-[5rem]" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
