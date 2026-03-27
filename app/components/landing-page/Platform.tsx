'use client'

import { motion } from 'framer-motion'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import {
  CapabilityVisual,
  UseCaseVisual,
} from '@/app/components/landing-page/landing-mini-visuals'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const PILLARS: {
  overline: string
  title: string
  body: string
  visual: React.ReactNode
}[] = [
  {
    overline: 'Build',
    title: 'Describe it. AI builds it.',
    body: 'Tabs, fields, views, master data — from one sentence.',
    visual: <CapabilityVisual variant="aiBuild" className="h-20 sm:h-24" />,
  },
  {
    overline: 'Work',
    title: 'Table, kanban, or form.',
    body: 'Switch views. Drag rows. Edit inline.',
    visual: <UseCaseVisual variant="table" className="h-20 sm:h-24" />,
  },
  {
    overline: 'Analyze',
    title: 'Ask your data questions.',
    body: 'Built-in analyst. No SQL, no exports.',
    visual: <CapabilityVisual variant="aiAnalyst" className="h-20 sm:h-24" />,
  },
]

export default function Platform() {
  return (
    <motion.section
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
        One platform.
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {PILLARS.map((pillar, idx) => (
          <motion.div
            key={pillar.overline}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
          >
            <LandingAxisFrame
              contentClassName={cn(
                theme.surface.secondarySubtle,
                'flex h-full flex-col gap-3 p-4 sm:p-5'
              )}
            >
              {pillar.visual}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {pillar.overline}
                </p>
                <h4 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                  {pillar.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-snug">
                  {pillar.body}
                </p>
              </div>
            </LandingAxisFrame>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
