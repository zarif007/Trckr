'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function Hero() {
  return (
    <section className="relative px-4 pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      {/* Minimal background: fine grid only, no gradients */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-grid-small opacity-[0.35] dark:opacity-[0.2]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              AI-native internal tracking
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 font-semibold leading-[1.1] tracking-[-0.04em] text-foreground"
          >
            <span className="block text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem]">
              Track
            </span>
            <span className="mt-2 block text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem]">
              <span className="relative inline-block px-1">
                <span
                  className="absolute inset-0 bottom-[0.12em] top-[0.12em] bg-foreground rounded-sm"
                  aria-hidden
                />
                <span className="relative text-background font-medium">everything your team runs on.</span>
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed tracking-[-0.01em]"
          >
            Notion-easy, spreadsheet-powerful. Describe what you need—AI builds trackers for projects, inventory, and
            requests.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="h-11 px-6 text-sm font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
              asChild
            >
              <a href="/login?callbackUrl=/tracker" className="inline-flex items-center gap-2">
                Get started
                <span className="text-background/80" aria-hidden>→</span>
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-sm font-medium rounded-md border-border bg-transparent hover:bg-muted/50 transition-colors"
              asChild
            >
              <a href="#demo">Watch demo</a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
