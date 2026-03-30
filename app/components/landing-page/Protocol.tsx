'use client'

import { motion } from 'framer-motion'
import { Sparkles, LayoutGrid, Brain } from 'lucide-react'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const STEPS: {
  num: string
  ordinal: string
  icon: React.ElementType
  title: string
  body: string
  example: string
}[] = [
  {
    num: '1',
    ordinal: '01',
    icon: Sparkles,
    title: 'Describe it',
    body: 'Type what your team tracks in one sentence. No forms, no schema, no setup.',
    example: '"Track client projects with budget, status, and team owner."',
  },
  {
    num: '2',
    ordinal: '02',
    icon: LayoutGrid,
    title: 'AI builds it',
    body: 'Schema, tabs, field types, validations, and views — generated in seconds. Ready to use.',
    example: 'Fields, rules, dropdowns, and views — done.',
  },
  {
    num: '3',
    ordinal: '03',
    icon: Brain,
    title: 'Run & ask',
    body: 'Your team fills it in. Ask the AI analyst for reports, trends, and answers — anytime.',
    example: '"Which projects are over budget?" → instant answer.',
  },
]

export default function Protocol() {
  return (
    <motion.section
      id="how"
      className="space-y-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-2.5">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Up and running in minutes
        </h3>
        <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
          From idea to working tracker — without a single config screen.
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 list-none p-0 m-0">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          return (
            <motion.li
              key={step.ordinal}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: idx * 0.1 }}
            >
              <LandingAxisFrame
                contentClassName={cn(
                  theme.surface.secondarySubtle,
                  'relative flex h-full flex-col gap-5 overflow-hidden p-5 sm:p-6'
                )}
              >
                {/* Giant ghost number */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-3 select-none text-[5.5rem] font-black leading-none tracking-tighter text-foreground/[0.04]"
                >
                  {step.num}
                </span>

                {/* Icon + ordinal */}
                <div className="relative z-10 flex items-start justify-between">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md border',
                      theme.border.subtle,
                      theme.surface.background
                    )}
                  >
                    <Icon className="h-4 w-4 text-foreground/50" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums tracking-widest text-muted-foreground/25">
                    {step.ordinal}
                  </span>
                </div>

                {/* Copy */}
                <div className="relative z-10 space-y-2">
                  <h4 className="text-base font-bold text-foreground tracking-tight leading-snug">
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    {step.body}
                  </p>
                </div>

                {/* Example chip */}
                <p
                  className={cn(
                    'relative z-10 mt-auto rounded-md border px-3 py-2 text-[11px] italic leading-relaxed text-muted-foreground/50',
                    theme.border.subtle,
                    theme.surface.background
                  )}
                >
                  {step.example}
                </p>
              </LandingAxisFrame>
            </motion.li>
          )
        })}
      </ol>
    </motion.section>
  )
}
