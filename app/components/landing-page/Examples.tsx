'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const HERO_EXAMPLE = {
  category: 'Projects & Ops',
  prompt: 'Track our project pipeline with status, owner, due date, and priority',
  youGet: 'Table + kanban by status',
}

const GROUPED_EXAMPLES = [
  {
    category: 'Projects & Ops',
    items: [
      {
        prompt: 'Track vendor contracts with renewal dates, owners, and cost per month',
        youGet: 'Table with dates and currency',
      },
    ],
  },
  {
    category: 'Requests & HR',
    items: [
      {
        prompt: 'Create an internal requests board for IT and facilities with assignee and SLA',
        youGet: 'Inbox, by owner',
      },
      {
        prompt: 'Track hiring pipeline with role, stage, recruiter, interviewer, and feedback',
        youGet: 'Table + kanban by stage',
      },
    ],
  },
  {
    category: 'Inventory & Assets',
    items: [
      {
        prompt: 'Log all company equipment with who has it, where it lives, and current status',
        youGet: 'Inventory table',
      },
      {
        prompt: 'Monitor inventory levels with location, reorder thresholds, and supplier',
        youGet: 'Table with thresholds',
      },
    ],
  },
]

export default function Examples() {
  return (
    <motion.section
      id="examples"
      className="space-y-8 sm:space-y-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="space-y-3 sm:space-y-4 text-center">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Describe your workflow—AI builds the tracker
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl font-medium mx-auto">
          From project pipelines to equipment logs, type in plain language and get a ready-to-use tracker for your team.
        </p>
      </div>

      {/* Hero example */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -4 }}
        className="group relative max-w-2xl mx-auto"
      >
        <div className="p-4 sm:p-6 rounded-md bg-secondary/30 border-2 border-border/50 transition-all hover:bg-secondary/50 hover:border-border">
          <Badge
            variant="outline"
            className="text-[9px] sm:text-[10px] uppercase tracking-widest bg-background/50 border-border/50 mb-2 sm:mb-3"
          >
            {HERO_EXAMPLE.category}
          </Badge>
          <p className="text-xs sm:text-sm text-foreground font-mono leading-relaxed">
            &ldquo;{HERO_EXAMPLE.prompt}&rdquo;
          </p>
          <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/60 uppercase tracking-tight mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/30">
            You get: {HERO_EXAMPLE.youGet}
          </p>
        </div>
      </motion.div>

      {/* Grouped prompts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto">
        {GROUPED_EXAMPLES.flatMap((group) =>
          group.items.map((item, itemIdx) => ({
            ...item,
            category: group.category,
            key: `${group.category}-${itemIdx}`,
          }))
        ).map(({ category, prompt, youGet, key }, idx) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -4 }}
            className="group relative"
          >
            <div className="p-4 sm:p-5 rounded-md bg-secondary/30 border border-border/50 transition-all hover:bg-secondary/50 hover:border-border cursor-pointer">
              <Badge
                variant="outline"
                className="text-[9px] sm:text-[10px] uppercase tracking-widest bg-background/50 border-border/50 mb-1.5 sm:mb-2"
              >
                {category}
              </Badge>
              <p className="text-xs sm:text-sm text-foreground/90 font-mono leading-relaxed">
                &ldquo;{prompt}&rdquo;
              </p>
              <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/60 uppercase tracking-tight mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/30">
                You get: {youGet}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <Button size="lg" className="rounded-md px-6 sm:px-8 text-sm sm:text-base" asChild>
          <a href="/login?callbackUrl=/tracker">Try with your own words →</a>
        </Button>
      </div>
    </motion.section>
  )
}
