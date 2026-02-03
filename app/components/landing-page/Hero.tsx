'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface HeroProps {
  y1: any
  y2: any
}

export default function Hero({ y1, y2 }: HeroProps) {
  return (
    <section className="relative pt-24 pb-48 overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-foreground/[0.06] via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-chart-2/10 dark:bg-chart-2/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-1/4 w-[300px] h-[300px] bg-chart-1/10 dark:bg-chart-1/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-small opacity-[0.4] dark:opacity-[0.25]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background mask-radial" />
      </div>

      {/* Floating ornaments */}
      <motion.div
        style={{ y: y1 }}
        className="absolute -top-16 -right-16 w-[420px] h-[420px] opacity-[0.12] dark:opacity-[0.08] pointer-events-none hidden lg:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full text-foreground">
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M50 50L150 50L150 150L50 150Z" />
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M80 20L180 20L180 120L80 120Z" />
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M50 50L80 20M150 50L180 20M150 150L180 120M50 150L80 120" />
        </svg>
      </motion.div>

      <motion.div
        style={{ y: y2 }}
        className="absolute top-1/2 -left-28 w-72 h-72 opacity-[0.08] dark:opacity-[0.06] pointer-events-none hidden lg:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full text-foreground">
          <rect x="20" y="20" width="50" height="160" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="75" y="20" width="50" height="160" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="130" y="20" width="50" height="160" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="25" y="30" width="40" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="25" y="55" width="40" height="25" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="25" y="85" width="40" height="15" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="80" y="40" width="40" height="30" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="80" y="75" width="40" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="135" y="30" width="40" height="40" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="135" y="75" width="40" height="15" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </motion.div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 border border-border/60 bg-background/70 dark:bg-background/50 backdrop-blur-xl shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-500/30" />
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
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="group h-12 px-8 text-base font-semibold rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10 transition-all duration-200 hover:shadow-xl hover:shadow-foreground/15 hover:scale-[1.02] active:scale-[0.98]"
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
            className="h-12 px-8 text-base font-medium rounded-full border-border/70 bg-background/50 hover:bg-muted/50 backdrop-blur-sm transition-all duration-200"
            asChild
          >
            <a href="#demo">Watch demo</a>
          </Button>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8 text-xs text-muted-foreground/70 font-inter"
        >
          No sign-up required · Start in seconds
        </motion.p>
      </div>
    </section>
  )
}
