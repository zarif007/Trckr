'use client'

import { motion } from 'framer-motion'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { CapabilityVisual } from '@/app/components/landing-page/landing-mini-visuals'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const CAPABILITIES: {
  title: string
  body: string
  visual:
  | 'aiBuild'
  | 'aiAnalyst'
  | 'editor'
  | 'drag'
  | 'calc'
  | 'validate'
  | 'master'
  | 'report'
}[] = [
    {
      title: 'AI builder',
      body: 'Prompt to tabs, grids, views, and option bindings.',
      visual: 'aiBuild',
    },
    {
      title: 'AI analyst',
      body: 'Summaries and Q&A from your rows—no invented numbers.',
      visual: 'aiAnalyst',
    },
    {
      title: 'Visual editor',
      body: 'Rename, reorder, add fields—same UI your team uses.',
      visual: 'editor',
    },
    {
      title: 'Drag and drop',
      body: 'Kanban moves plus structural reorder where it matters.',
      visual: 'drag',
    },
    {
      title: 'Calculations',
      body: 'Computed fields and chained formulas as data changes.',
      visual: 'calc',
    },
    {
      title: 'Validations & logic',
      body: 'Rules plus conditional show, require, and disable.',
      visual: 'validate',
    },
    {
      title: 'Master data',
      body: 'Dropdowns backed by grids or linked trackers.',
      visual: 'master',
    },
    {
      title: 'Reports-ready',
      body: 'Structured answers from the data you already edit.',
      visual: 'report',
    },
  ]

const CHIP_LABELS = ['AI', 'Editor', 'Logic', 'Data']

export default function LandingPlatformPower() {
  return (
    <motion.section
      id="platform"
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
          One engine
        </h3>
        <div
          className={cn(
            'flex flex-wrap gap-1.5',
            'text-[10px] font-bold uppercase tracking-widest text-muted-foreground'
          )}
          aria-label="Capability areas"
        >
          {CHIP_LABELS.map((label, i) => (
            <span key={label} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-border" aria-hidden>
                  ·
                </span>
              )}
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {CAPABILITIES.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.03 }}
            title={item.body}
          >
            <LandingAxisFrame
              contentClassName={cn(
                theme.surface.secondarySubtle,
                'flex h-full flex-col gap-2 p-3 sm:p-3.5'
              )}
            >
              <CapabilityVisual variant={item.visual} />
              <h4 className="text-[12px] sm:text-[13px] font-bold text-foreground tracking-tight leading-tight">
                {item.title}
              </h4>
            </LandingAxisFrame>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
