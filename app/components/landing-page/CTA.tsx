'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

export default function CTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-visible py-20 text-center sm:py-28 md:py-40"
    >
      {/* Gradient divider above */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-border/40 to-transparent [transform:translateZ(0)]"
      />
      <div className="absolute inset-0 bg-grid-small opacity-[0.05] dark:opacity-[0.08]" />

      <LandingAxisFrame
        className="relative z-10 mx-auto max-w-4xl"
        contentClassName={cn(
          theme.surface.ctaWash,
          'px-4 py-14 sm:px-8 sm:py-20 md:py-28',
        )}
      >
        <div className="space-y-10 sm:space-y-16">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground max-w-3xl mx-auto leading-[0.95] px-3"
          >
            Internal tracking, reimagined <br />
            <span className="text-muted-foreground/35 text-2xl sm:text-4xl md:text-5xl lg:text-6xl">for your team</span>
          </motion.h3>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              size="lg"
              className="h-13 sm:h-14 md:h-16 px-8 sm:px-12 md:px-14 text-base sm:text-lg font-semibold rounded-md bg-foreground text-background transition-all duration-200"
              asChild
            >
              <a href="/login?callbackUrl=/tracker" className="inline-flex items-center justify-center gap-2.5">
                Start Building Now
                <span aria-hidden className="text-background/70">
                  →
                </span>
              </a>
            </Button>
          </motion.div>
          <motion.p
            className="text-muted-foreground/70 text-xs sm:text-sm font-semibold tracking-wider uppercase"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Built for startups and small teams who have outgrown spreadsheets
          </motion.p>
        </div>
      </LandingAxisFrame>
    </motion.section>
  )
}
