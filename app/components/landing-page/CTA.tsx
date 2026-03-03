'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function CTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="relative text-center py-32 border-t border-border/30 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid-small opacity-10 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />

      <div className="space-y-12 relative z-10">
        <h3 className="text-4xl md:text-7xl font-black tracking-tighter text-foreground max-w-3xl mx-auto leading-[0.9]">
          Internal tracking, reimagined <br />
          <span className="text-muted-foreground/40">for teams of 1–50.</span>
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Button size="lg" className="h-16 px-12 text-xl font-black rounded-md group transition-all hover:scale-105 active:scale-95 bg-foreground text-background" asChild>
            <a href="/login?callbackUrl=/tracker">
              Start Building Now
              <span className="inline-block transition-transform group-hover:translate-x-2 ml-3" aria-hidden>→</span>
            </a>
          </Button>
        </div>
        <p className="text-muted-foreground text-base font-bold tracking-tight uppercase opacity-60">
          Built for startups and small teams who have outgrown spreadsheets
        </p>
      </div>
    </motion.section>
  )
}
