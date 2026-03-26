'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  Database,
  Kanban,
  Sigma,
  Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { AnalystAskVisual } from '@/app/components/landing-page/landing-mini-visuals'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { dataSuggestions } from '@/app/tracker/hooks/constants'

const LOGIN_HREF = '/login?callbackUrl=/tracker'

const ASK_VISUAL_VARIANTS = ['summary', 'trends', 'suggestions'] as const

const HERO_EXAMPLE = {
  category: 'Projects & Ops',
  prompt:
    'Track our project pipeline with status, owner, due date, and priority',
}

const OUTPUT_CHIPS: { icon: typeof Table2; label: string }[] = [
  { icon: Table2, label: 'Table' },
  { icon: Kanban, label: 'Kanban' },
  { icon: Database, label: 'Master data' },
  { icon: Sigma, label: 'Formulas' },
]

const GROUPED_EXAMPLES = [
  {
    category: 'Projects & Ops',
    items: [
      {
        prompt:
          'Track vendor contracts with renewal dates, owners, and cost per month',
        tags: ['Renewal views', 'Spend by vendor', 'Formulas'],
      },
    ],
  },
  {
    category: 'Requests & HR',
    items: [
      {
        prompt:
          'Create an internal requests board for IT and facilities with assignee and SLA',
        tags: ['Inbox + filters', 'SLA columns', 'Field rules'],
      },
      {
        prompt:
          'Track hiring pipeline with role, stage, recruiter, interviewer, and feedback',
        tags: ['Kanban by stage', 'Table reporting', 'Conditional fields'],
      },
    ],
  },
  {
    category: 'Inventory & Assets',
    items: [
      {
        prompt:
          'Log all company equipment with who has it, where it lives, and current status',
        tags: ['Asset register', 'Master list options', 'Filters'],
      },
      {
        prompt:
          'Monitor inventory levels with location, reorder thresholds, and supplier',
        tags: ['Stock table', 'Reorder logic', 'Calculated alerts'],
      },
    ],
  },
]

function PanelSilhouette({
  label,
  hint,
}: {
  label: string
  hint: string
}) {
  return (
    <div
      className="flex flex-col items-center gap-2"
      title={hint}
    >
      <div
        className={cn(
          'w-[4.25rem] sm:w-[5.25rem] rounded-md border overflow-hidden bg-muted/25 shadow-sm',
          theme.border.subtle
        )}
      >
        <div className="h-2 bg-muted/70 border-b border-border/50" />
        <div className="p-1.5 space-y-1">
          <div className="h-1 rounded-sm bg-foreground/10" />
          <div className="h-1 rounded-sm bg-foreground/8 w-[88%]" />
          <div className="h-1 rounded-sm bg-foreground/8 w-[62%]" />
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function WorkflowStrip() {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-center gap-4 sm:gap-8 py-4 px-3 rounded-md border',
        theme.border.subtle,
        theme.surface.secondarySoft
      )}
    >
      <PanelSilhouette
        label="Describe"
        hint="Say what you track in plain language"
      />
      <span className="text-muted-foreground/30 pb-6 hidden sm:inline text-lg" aria-hidden>
        →
      </span>
      <PanelSilhouette
        label="Ship"
        hint="Table, kanban, and fields your team uses"
      />
      <span className="text-muted-foreground/30 pb-6 hidden sm:inline text-lg" aria-hidden>
        →
      </span>
      <PanelSilhouette
        label="Ask"
        hint="Analyst answers from your rows"
      />
    </div>
  )
}

/** Mini visuals for Ask tab — mirrors Build workflow strip energy */
function AskWorkflowStrip() {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-center gap-4 sm:gap-8 py-4 px-3 rounded-md border',
        theme.border.subtle,
        theme.surface.secondarySoft
      )}
    >
      <div className="flex flex-col items-center gap-2" title="Live tracker rows">
        <div
          className={cn(
            'w-[4.25rem] sm:w-[5.25rem] rounded-md border p-2 space-y-1 bg-muted/25 shadow-sm',
            theme.border.subtle
          )}
        >
          <div className="h-1 rounded-sm bg-foreground/12 w-full" />
          <div className="h-1 rounded-sm bg-foreground/10 w-[90%]" />
          <div className="h-1 rounded-sm bg-foreground/10 w-[75%]" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Rows
        </span>
      </div>
      <span className="text-muted-foreground/30 pb-6 hidden sm:inline text-lg" aria-hidden>
        →
      </span>
      <div className="flex flex-col items-center gap-2" title="Natural-language questions">
        <div
          className={cn(
            'w-[4.25rem] sm:w-[5.25rem] rounded-md border p-2 flex flex-col gap-1 justify-end bg-muted/25 shadow-sm',
            theme.border.subtle
          )}
        >
          <div className="h-2 w-[85%] rounded-full bg-foreground/15 ml-auto" />
          <div className="h-2 w-[70%] rounded-full bg-muted-foreground/15 ml-auto" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Ask
        </span>
      </div>
      <span className="text-muted-foreground/30 pb-6 hidden sm:inline text-lg" aria-hidden>
        →
      </span>
      <div className="flex flex-col items-center gap-2" title="Summaries, trends, next steps">
        <div
          className={cn(
            'w-[4.25rem] sm:w-[5.25rem] rounded-md border p-2 flex flex-col justify-end gap-1 bg-muted/25 shadow-sm',
            theme.border.subtle
          )}
        >
          <div className="flex items-end gap-0.5 h-7 px-0.5">
            {[32, 48, 38, 58, 42, 52].map((pct, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-foreground/18 min-w-0"
                style={{ height: `${pct}%` }}
              />
            ))}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Insight
        </span>
      </div>
    </div>
  )
}

export default function Examples() {
  return (
    <motion.section
      id="examples"
      className="space-y-7 sm:space-y-9"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-center text-xl sm:text-2xl font-bold tracking-tight text-foreground max-w-md mx-auto">
        From a sentence to structure—and answers
      </h3>

      <Tabs defaultValue="build" className="w-full max-w-4xl mx-auto gap-4">
        <TabsList className="mx-auto flex w-full max-w-xs sm:max-w-sm">
          <TabsTrigger value="build" className="flex-1 text-xs sm:text-sm">
            Build
          </TabsTrigger>
          <TabsTrigger value="ask" className="flex-1 text-xs sm:text-sm">
            Ask data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-0 space-y-5">
          <WorkflowStrip />

          <LandingAxisFrame
            contentClassName={cn(theme.surface.secondarySubtle, 'p-4 sm:p-5 space-y-3')}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] uppercase tracking-widest sm:text-[10px]',
                  theme.surface.badgeWash,
                  theme.border.subtleAlt
                )}
              >
                {HERO_EXAMPLE.category}
              </Badge>
            </div>
            <div
              className={cn(
                'flex items-stretch gap-2 rounded-lg border bg-background/90 p-1.5 pl-2',
                theme.border.subtle
              )}
            >
              <p className="flex-1 min-w-0 self-center px-2 text-xs sm:text-sm text-foreground font-mono leading-snug line-clamp-3">
                {HERO_EXAMPLE.prompt}
              </p>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background shadow-sm"
                aria-hidden
              >
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {OUTPUT_CHIPS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold text-foreground',
                    theme.border.subtle,
                    'bg-background/60'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </LandingAxisFrame>

          <div className="space-y-4">
            {GROUPED_EXAMPLES.map((group) => (
              <div key={group.category} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                  {group.category}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.items.map((item) => (
                    <LandingAxisFrame
                      key={item.prompt}
                      contentClassName={cn(
                        theme.surface.secondarySoft,
                        'p-3 sm:p-3.5 space-y-2'
                      )}
                    >
                      <p className="text-xs text-foreground font-mono leading-snug line-clamp-2">
                        &ldquo;{item.prompt}&rdquo;
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] font-medium px-1.5 py-0 h-5 normal-case tracking-normal text-muted-foreground"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </LandingAxisFrame>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ask" className="mt-0 space-y-5">
          <AskWorkflowStrip />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {dataSuggestions.map((item, idx) => (
              <div key={item.title} title={item.desc}>
                <LandingAxisFrame
                  contentClassName={cn(
                    theme.surface.secondarySubtle,
                    'flex h-full flex-col gap-3 p-3.5 sm:p-4 overflow-hidden'
                  )}
                >
                  <AnalystAskVisual variant={ASK_VISUAL_VARIANTS[idx]} />

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground leading-tight min-w-0">
                      {item.title}
                    </span>
                    <a
                      href={LOGIN_HREF}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background shadow-sm transition-opacity hover:opacity-90"
                      aria-label="Sign in to try analyst"
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </a>
                  </div>

                  <div
                    className={cn(
                      'rounded-lg border bg-background/90 p-2 sm:p-2.5 flex-1 min-h-0',
                      theme.border.subtle
                    )}
                  >
                    <p className="text-[10px] sm:text-[11px] text-foreground font-mono leading-relaxed line-clamp-4">
                      &ldquo;{item.query}&rdquo;
                    </p>
                  </div>
                </LandingAxisFrame>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pt-0.5">
        <Button
          size="lg"
          className={cn(
            theme.radius.md,
            'gap-2 px-6 text-sm sm:px-8 sm:text-base'
          )}
          asChild
        >
          <a href={LOGIN_HREF}>
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </Button>
      </div>
    </motion.section>
  )
}
