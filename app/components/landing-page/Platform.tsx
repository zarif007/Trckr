'use client'

import { motion } from 'framer-motion'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { CapabilityVisual, UseCaseVisual } from '@/app/components/landing-page/landing-mini-visuals'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

/** Inline illustration: AI prompt → generated schema */
function AiBuildIllustration() {
  const FIELDS = ['Client', 'Deal size', 'Stage', 'Close date', 'Owner']
  const ROWS = [
    ['Acme Corp', '$42,000', 'Proposal', 'Mar 28', 'S. Chen'],
    ['TechFlow', '$18,500', 'Discovery', 'Apr 12', 'J. Park'],
    ['Globex', '$91,000', 'Negotiation', 'Mar 31', 'A. Reid'],
  ]

  return (
    <div className="space-y-2.5">
      {/* Prompt bubble */}
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-md border px-3 py-2.5',
          theme.border.subtle,
          theme.surface.background
        )}
      >
        <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-[8px] font-bold text-foreground/40">
          AI
        </span>
        <p className="text-[11px] leading-relaxed text-muted-foreground/65">
          {'"Track our sales pipeline — client name, deal size, stage, close date, and owner."'}
        </p>
      </div>

      {/* Connector */}
      <div className="flex items-center gap-1.5 pl-3.5">
        <div className="h-px w-3 bg-border/50" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/35">
          generated
        </span>
        <div className="h-px flex-1 bg-border/30" />
      </div>

      {/* Mini tracker table */}
      <div className={cn('overflow-hidden rounded-md border', theme.border.subtle)}>
        <div
          className="grid px-2.5 py-1.5"
          style={{ gridTemplateColumns: `repeat(${FIELDS.length}, minmax(0, 1fr))` }}
        >
          {FIELDS.map((h) => (
            <span key={h} className="truncate text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">
              {h}
            </span>
          ))}
        </div>
        {ROWS.map((row, ri) => (
          <div
            key={ri}
            className={cn(
              'grid border-t px-2.5 py-1.5',
              theme.surface.background
            )}
            style={{
              gridTemplateColumns: `repeat(${FIELDS.length}, minmax(0, 1fr))`,
              borderColor: 'hsl(var(--border) / 0.35)',
            }}
          >
            {row.map((cell, ci) => (
              <span
                key={ci}
                className={cn(
                  'truncate text-[10px]',
                  ci === 0 ? 'font-medium text-foreground/70' : 'text-muted-foreground/55'
                )}
              >
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const SECONDARY_CARDS = [
  {
    overline: 'Work',
    title: 'Table, kanban, or form — your choice.',
    body: 'Switch views, drag rows, edit inline. Everything your team needs to stay on top of work.',
    visual: <UseCaseVisual variant="table" className="h-14" />,
  },
  {
    overline: 'Analyze',
    title: 'Ask your data anything.',
    body: 'Built-in AI analyst reads your rows and surfaces trends — no SQL, no exports.',
    visual: <CapabilityVisual variant="aiAnalyst" className="h-14" />,
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
      className="space-y-3"
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

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5">
        {/* Hero Build card */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          <LandingAxisFrame
            contentClassName={cn(
              theme.surface.secondarySubtle,
              'flex h-full flex-col gap-4 p-5 sm:p-6'
            )}
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Build
              </p>
              <h4 className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
                Describe it. Your tracker is ready in seconds.
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                One sentence is all it takes. Trckr generates tabs, fields, views, validations,
                and dropdown bindings — instantly.
              </p>
            </div>
            <AiBuildIllustration />
          </LandingAxisFrame>
        </motion.div>

        {/* Work + Analyze stacked */}
        <div className="lg:col-span-2 flex flex-col gap-2.5">
          {SECONDARY_CARDS.map((card, idx) => (
            <motion.div
              key={card.overline}
              className="flex-1"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.07 + idx * 0.07 }}
            >
              <LandingAxisFrame
                contentClassName={cn(
                  theme.surface.secondarySubtle,
                  'flex h-full flex-col gap-3 p-4 sm:p-5'
                )}
              >
                {card.visual}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {card.overline}
                  </p>
                  <h4 className="text-sm font-bold text-foreground tracking-tight leading-tight">
                    {card.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {card.body}
                  </p>
                </div>
              </LandingAxisFrame>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Use cases strip */}
      <motion.div
        className="space-y-2.5 pt-1"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Teams use Trckr for
        </p>
        <div className="flex flex-wrap gap-1.5">
          {USE_CASES.map((uc) => (
            <span
              key={uc}
              className={cn(
                'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground/65',
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
