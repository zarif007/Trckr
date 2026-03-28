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
    body: 'Tell Trckr what you track in plain language — tabs, fields, views, and validations are generated in seconds. No schema design. No setup forms.',
    visual: <CapabilityVisual variant="aiBuild" className="h-20 sm:h-24" />,
  },
  {
    overline: 'Work',
    title: 'Table, kanban, or form.',
    body: 'Switch between views without losing anything. Drag rows, edit inline, and filter — everything your team needs to stay on top of work.',
    visual: <UseCaseVisual variant="table" className="h-20 sm:h-24" />,
  },
  {
    overline: 'Analyze',
    title: 'Ask your data questions.',
    body: 'A built-in AI analyst reads your rows, writes summaries, and surfaces trends — without exports, SQL, or a data team.',
    visual: <CapabilityVisual variant="aiAnalyst" className="h-20 sm:h-24" />,
  },
]

const USE_CASES = [
  'Sales pipeline',
  'Project tracker',
  'Inventory',
  'HR onboarding',
  'Client delivery',
  'Bug tracking',
  'Event planning',
  'Vendor contracts',
  'Time-off requests',
  'Sprint planning',
]

export default function Platform() {
  return (
    <motion.section
      className="space-y-6 sm:space-y-8"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-1.5">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
          One platform — built for the way teams actually work.
        </h3>
        <p className="text-sm text-muted-foreground">
          No code. No spreadsheet chaos. Describe it, and Trckr handles the rest.
        </p>
      </div>

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
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {pillar.overline}
                </p>
                <h4 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                  {pillar.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pillar.body}
                </p>
              </div>
            </LandingAxisFrame>
          </motion.div>
        ))}
      </div>

      {/* Use cases strip */}
      <motion.div
        className="space-y-2.5"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/55">
          Teams use Trckr for
        </p>
        <div className="flex flex-wrap gap-1.5">
          {USE_CASES.map((uc) => (
            <span
              key={uc}
              className={cn(
                'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground/70',
                theme.border.subtle,
                theme.surface.secondarySubtle
              )}
            >
              {uc}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.section>
  )
}
