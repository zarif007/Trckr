'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

export default function CTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="relative overflow-visible py-16 text-center sm:py-24 md:py-32"
    >
      {/* Same paint as LandingAxisFrame lines (`h-px` fill, not `border-*`) so color matches exactly */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px [transform:translateZ(0)]"
        style={{ backgroundColor: 'hsl(var(--border))' }}
      />
      <div className="absolute inset-0 bg-grid-small opacity-10 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />

      <LandingAxisFrame
        className="relative z-10 mx-auto max-w-4xl"
        contentClassName={cn(
          theme.surface.ctaWash,
          'px-4 py-10 sm:px-6 sm:py-14 md:py-16',
        )}
      >
        <div className="space-y-8 sm:space-y-12">
          <h3 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-foreground max-w-3xl mx-auto leading-[0.9] px-2">
            Internal tracking, reimagined <br />
            <span className="text-muted-foreground/40">for teams of 1–50.</span>
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Button
              size="lg"
              className="h-12 sm:h-14 md:h-16 px-6 sm:px-10 md:px-12 text-base sm:text-lg md:text-xl font-black rounded-md bg-foreground text-background"
              asChild
            >
              <a href="/login?callbackUrl=/tracker">
                Start Building Now
                <span className="inline-block ml-3" aria-hidden>
                  →
                </span>
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base font-bold tracking-tight uppercase opacity-60">
            Built for startups and small teams who have outgrown spreadsheets
          </p>
        </div>
      </LandingAxisFrame>
    </motion.section>
  )
}
