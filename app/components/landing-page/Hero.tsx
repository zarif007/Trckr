'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

export default function Hero() {
  return (
    <section className="relative overflow-visible px-3 pb-20 pt-[3.5rem] sm:px-4 sm:pb-24 sm:pt-28 md:pb-16 md:pt-24">
      <div className="relative z-10 mx-auto flex min-h-[min(82svh,880px)] max-w-6xl flex-col justify-center sm:min-h-[min(76svh,800px)] md:min-h-0">
        <LandingAxisFrame
          className="mx-auto w-full max-w-6xl"
          extend={30}
          contentClassName={cn(
            theme.surface.secondaryHero,
            'px-5 py-14 sm:px-8 sm:py-16 md:px-14 md:py-20 lg:px-16 lg:py-24'
          )}
        >
          <div className="text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 sm:gap-2 sm:px-3.5 sm:py-1.5',
                theme.border.default,
                theme.surface.background
              )}
            >
              <span className="relative flex h-2 w-2 sm:h-1.5 sm:w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success sm:h-1.5 sm:w-1.5" />
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-[11px]">
                AI-native Data Tracking
              </span>
            </motion.div>

            {/* Headline — larger on small screens (fluid vw) so the hero reads as the main beat */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-9 text-balance font-semibold leading-[1.05] tracking-[-0.042em] text-foreground sm:mt-12"
            >
              <span className="block text-[clamp(2.875rem,10.5vw,3.35rem)] sm:text-[2.85rem] md:text-[3.5rem] lg:text-[4.25rem] xl:text-[5rem]">
                Track
              </span>
              <span className="mt-2 block text-[clamp(2.875rem,10.5vw,3.35rem)] sm:mt-2 sm:text-[2.85rem] md:text-[3.5rem] lg:text-[4.25rem] xl:text-[5rem]">
                <span className="relative inline-block px-1 sm:px-1.5">
                  <span
                    className="absolute inset-x-0 bottom-[0.1em] top-[0.1em] rounded-md bg-foreground"
                    aria-hidden
                  />
                  <span className="relative font-medium text-background">
                    everything your team runs on.
                  </span>
                </span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.14,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed tracking-[-0.015em] text-muted-foreground sm:mt-8 sm:text-lg md:mt-9 md:text-xl"
            >
              Notion-easy, spreadsheet-powerful. Describe what you need—AI
              builds trackers for projects, inventory, and requests.
            </motion.p>

            {/* CTAs — full-width on narrow phones for a stronger, app-like hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto mt-10 flex w-full max-w-md flex-col gap-3 sm:mt-11 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3"
            >
              <Button
                size="lg"
                className="h-12 w-full text-sm font-medium sm:h-11 sm:w-auto sm:px-6 sm:text-sm rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
                asChild
              >
                <a
                  href="/login?callbackUrl=/tracker"
                  className="inline-flex items-center justify-center gap-2"
                >
                  Get started
                  <span className="text-background/80" aria-hidden>
                    →
                  </span>
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  'h-12 w-full text-sm font-medium sm:h-11 sm:w-auto sm:px-6 sm:text-sm bg-transparent hover:bg-muted/50 transition-colors',
                  theme.radius.md,
                  theme.border.default
                )}
                asChild
              >
                <a href="#demo">Watch demo</a>
              </Button>
            </motion.div>
          </div>
        </LandingAxisFrame>
      </div>
    </section>
  )
}
