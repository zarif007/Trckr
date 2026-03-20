'use client'

import { motion } from 'framer-motion'
import { PenLine, LayoutTemplate, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'

const STEPS = [
  {
    title: 'Describe the work',
    body: 'Say what you need to track—people, dates, stages, locations, SLAs, or anything else—in normal sentences. No schema design up front.',
    icon: PenLine,
  },
  {
    title: 'Review the layout',
    body: 'Trckr proposes columns, default views (table, kanban, inbox), and sensible groupings. Adjust names or add fields before you go live.',
    icon: LayoutTemplate,
  },
  {
    title: 'Start tracking',
    body: 'Invite the team and use it like any other board: edit rows, move cards, filter, and export. Refine fields anytime as the process changes.',
    icon: Play,
  },
]

export default function Protocol() {
  return (
    <motion.section
      id="how"
      className="space-y-10 sm:space-y-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            From a short description to a working tracker
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base font-medium leading-relaxed">
            Trckr is built around a simple loop: you explain the workflow once,
            we generate a first version you can ship, and you keep improving it
            as your team learns what matters. No separate “design phase” before
            anyone can log real work.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-fit shrink-0 border-border/60"
        >
          <a href="#examples">
            See example prompts <span className="ml-1.5">↓</span>
          </a>
        </Button>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="hidden lg:block absolute top-[52px] left-[8%] right-[8%] h-px bg-border/60 pointer-events-none"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5">
          {STEPS.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className="relative"
              >
                <LandingAxisFrame contentClassName="p-5 sm:p-6 bg-secondary/30 h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 text-xs font-bold text-foreground">
                      {idx + 1}
                    </span>
                    <Icon
                      className="h-5 w-5 text-primary mt-1.5 shrink-0"
                      aria-hidden
                    />
                  </div>
                  <h4 className="text-lg font-bold text-foreground tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-medium mt-2 flex-1">
                    {item.body}
                  </p>
                </LandingAxisFrame>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
