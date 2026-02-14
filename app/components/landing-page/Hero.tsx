'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function Hero() {
  return (
    <section className="relative px-4 pt-32 pb-24 md:py-32 overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-foreground/[0.06] dark:from-foreground/[0.1] via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-chart-2/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-1/4 w-[300px] h-[300px] bg-chart-1/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-small opacity-[0.4]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background mask-radial" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2.5 rounded-md px-4 py-2 border border-border/60 bg-background/70 dark:bg-background/50 backdrop-blur-xl"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success ring-2 ring-success/30" />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            AI-native data tracking
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="font-space mt-10 text-[3.5rem] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6.25rem] font-bold leading-[1.08] tracking-[-0.03em]"
        >
          <span className="block">Track</span>
          <span className="relative inline-block mt-1">
            <span className="absolute inset-0 bg-foreground -rotate-1.5 rounded-md scale-105 origin-center" />
            <span className="relative px-5 py-1.5 text-background font-bold tracking-tight">Anything.</span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground/90 font-inter font-normal leading-relaxed tracking-[-0.01em] max-w-2xl mx-auto"
        >
          From a single prompt. No templates, no complexity—just the tracker you need, generated instantly.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="mt-12 flex flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="group sm:h-12 px-6 text-base font-semibold rounded-md bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            asChild
          >
            <a href="/tracker" className="inline-flex items-center">
              Get started
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="sm:h-12 px-6 text-base font-medium rounded-md border-border/70 bg-background/50 hover:bg-muted/50 backdrop-blur-sm transition-all duration-200"
            asChild
          >
            <a href="#demo">Watch demo</a>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
