'use client'

import { motion } from 'framer-motion'
import {
  PenLine,
  Bot,
  LayoutTemplate,
  SlidersHorizontal,
  LineChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const STEPS = [
  {
    title: 'Describe',
    body: 'Plain language—no schema meeting first.',
    icon: PenLine,
  },
  {
    title: 'AI drafts',
    body: 'Tabs, grids, views, master-data bindings.',
    icon: Bot,
  },
  {
    title: 'Shape visually',
    body: 'Edit mode: drag, reorder, add fields.',
    icon: LayoutTemplate,
  },
  {
    title: 'Add rules',
    body: 'Validations, formulas, conditional fields.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Run & ask',
    body: 'Work the board; analyst reads your rows.',
    icon: LineChart,
  },
]

export default function Protocol() {
  return (
    <motion.section
      id="how"
      className="space-y-6 sm:space-y-8"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          How it works
        </h3>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn('w-fit shrink-0', theme.border.subtle)}
        >
          <a href="#examples">
            Examples <span className="ml-1 opacity-70">↓</span>
          </a>
        </Button>
      </div>

      <div className="relative">
        {/* Timeline spine (desktop) */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-[5%] right-[5%] top-[14px] hidden h-px xl:block',
            theme.surface.mutedLine
          )}
        />

        <ol className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 list-none p-0 m-0 xl:pt-1">
          {STEPS.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                title={item.body}
                className="relative"
              >
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute left-1/2 top-0 z-[1] hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background xl:block',
                    theme.border.subtle
                  )}
                />
                <LandingAxisFrame
                  contentClassName={cn(
                    theme.surface.secondarySubtle,
                    'flex h-full flex-col items-center text-center gap-2.5 p-4 sm:p-5 xl:pt-6'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 items-center justify-center border shrink-0',
                      theme.radius.md,
                      theme.border.subtle,
                      'bg-background/80'
                    )}
                  >
                    <Icon className="h-5 w-5 text-foreground" aria-hidden />
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground tracking-tight leading-tight">
                    {item.title}
                  </h4>
                </LandingAxisFrame>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </motion.section>
  )
}
