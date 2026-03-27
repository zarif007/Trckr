'use client'

import { motion } from 'framer-motion'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const STEPS = [
  {
    num: '01',
    title: 'Describe',
    body: 'Write what you track in plain language.',
  },
  {
    num: '02',
    title: 'AI builds',
    body: 'Schema, tabs, views, and field logic — generated.',
  },
  {
    num: '03',
    title: 'Run & ask',
    body: 'Your team works it. The analyst reads it.',
  },
]

export default function Protocol() {
  return (
    <motion.section
      id="how"
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        How it works
      </h3>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 list-none p-0 m-0">
        {STEPS.map((step, idx) => (
          <motion.li
            key={step.num}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.06 }}
          >
            <LandingAxisFrame
              contentClassName={cn(
                theme.surface.secondarySubtle,
                'flex h-full flex-col gap-3 p-4 sm:p-5'
              )}
            >
              <span className="text-[11px] font-bold tabular-nums tracking-widest text-muted-foreground/50">
                {step.num}
              </span>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-snug">
                  {step.body}
                </p>
              </div>
            </LandingAxisFrame>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  )
}
