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
import { theme } from '@/lib/theme'

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
        className="h-screen box-border font-sans bg-background text-foreground overflow-hidden flex flex-col pt-12 hidden md:flex"
        aria-hidden={!isDesktop}
      >
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <section
            className={cn(
              'relative h-full w-full bg-background/60 transition-shadow duration-300',
              theme.radius.md
            )}
          >
            {/* Toolbar strip — matches TrackerPanel top bar */}
            <div
              className={cn(
                'absolute top-3 right-3 z-20 flex max-w-[calc(100%-0.5rem)] flex-wrap items-center justify-end gap-1 rounded-md border bg-background/90 p-1 shadow-sm',
                theme.border.subtle
              )}
            >
              <div
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-md border bg-background/80 p-0.5',
                  theme.border.subtle
                )}
              >
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-14 rounded-md" />
            </div>

            {/* Content area — matches TrackerPanel scroll + TrackerDisplayInline card */}
            <div className="h-full overflow-y-auto px-3 pt-14 pb-4">
              <div className="w-full min-w-0 space-y-4 px-0 py-3 md:p-4 bg-card rounded-md">
                <Tabs defaultValue="tab1" className="w-full min-w-0 gap-2">
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
                          <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
                          <Skeleton className="h-4 flex-1 max-w-[180px]" />
                        </div>
                        <div className={GRIDS_CONTAINER}>
                          <div
                            className={cn(
                              'w-full min-w-0 overflow-hidden border',
                              theme.radius.md,
                              theme.border.verySubtle
                            )}
                          >
                            <div
                              className={cn(
                                'flex w-full gap-3 border-b bg-muted/30 px-3 py-2.5',
                                theme.border.verySubtle
                              )}
                            >
                              <Skeleton className="h-4 w-24 shrink-0" />
                              <Skeleton className="h-4 flex-1 min-w-0 max-w-[8rem]" />
                              <Skeleton className="h-4 w-20 shrink-0" />
                            </div>
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  'flex w-full gap-3 border-b px-3 py-2.5 last:border-0',
                                  theme.border.divider
                                )}
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
                          <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
                          <Skeleton className="h-4 flex-1 max-w-[140px]" />
                        </div>
                        <div className={GRIDS_CONTAINER}>
                          <div
                            className={cn(
                              'w-full min-w-0 overflow-hidden border',
                              theme.radius.md,
                              theme.border.verySubtle
                            )}
                          >
                            <div
                              className={cn(
                                'flex w-full gap-3 border-b bg-muted/30 px-3 py-2.5',
                                theme.border.verySubtle
                              )}
                            >
                              <Skeleton className="h-4 w-28 shrink-0" />
                              <Skeleton className="h-4 flex-1 min-w-0 max-w-[6rem]" />
                            </div>
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  'flex w-full gap-3 border-b px-3 py-2.5 last:border-0',
                                  theme.border.divider
                                )}
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
        className="h-screen box-border font-sans bg-background text-foreground overflow-hidden flex flex-col pt-12 md:hidden"
        aria-hidden={isDesktop}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs defaultValue="preview" className="flex-1 min-h-0 flex flex-col gap-0">
            <div
              className={cn(
                'shrink-0 border-b px-1 py-1.5 backdrop-blur bg-background/95',
                theme.border.subtle
              )}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="chat" disabled>
                  Chat
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
              <section
                className={cn(
                  'relative h-full w-full overflow-y-auto bg-background/60 px-1 pt-12 pb-2',
                  theme.radius.md
                )}
              >
                <div
                  className={cn(
                    'absolute top-3 right-1 z-20 flex max-w-[calc(100%-0.5rem)] items-center gap-1 rounded-md border bg-background/90 p-1 shadow-sm',
                    theme.border.subtle
                  )}
                >
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <div className="w-full min-w-0 space-y-4 px-0 py-3 bg-card rounded-md">
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
                          <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
                          <Skeleton className="h-4 flex-1 max-w-[160px]" />
                        </div>
                        <div className={GRIDS_CONTAINER}>
                          <div
                            className={cn(
                              'w-full min-w-0 overflow-hidden border',
                              theme.radius.md,
                              theme.border.verySubtle
                            )}
                          >
                            <div
                              className={cn(
                                'flex w-full gap-3 border-b bg-muted/30 px-3 py-2.5',
                                theme.border.verySubtle
                              )}
                            >
                              <Skeleton className="h-3.5 w-16 shrink-0" />
                              <Skeleton className="h-3.5 flex-1 min-w-0 max-w-[5rem]" />
                            </div>
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  'flex w-full gap-3 border-b px-3 py-2.5 last:border-0',
                                  theme.border.divider
                                )}
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
