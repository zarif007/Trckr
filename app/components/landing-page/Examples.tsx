'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const HERO_EXAMPLE = {
  category: 'Projects & Ops',
  prompt:
    'Track our project pipeline with status, owner, due date, and priority',
  youGet: {
    summary: 'A live board your team can update without touching a spreadsheet.',
    detail:
      'Columns for project, owner, status, priority, due date • Table plus kanban grouped by status • Sort and filter by owner or date',
  },
}

const GROUPED_EXAMPLES = [
  {
    category: 'Projects & Ops',
    lead: 'Vendor, budget, and delivery workflows—same tool as internal projects.',
    items: [
      {
        prompt:
          'Track vendor contracts with renewal dates, owners, and cost per month',
        youGet:
          'Renewal calendar, spend per vendor • Columns: vendor, owner, renewal date, monthly cost, notice period',
      },
    ],
  },
  {
    category: 'Requests & HR',
    lead: 'Turn scattered Slack threads and tickets into one queue with owners.',
    items: [
      {
        prompt:
          'Create an internal requests board for IT and facilities with assignee and SLA',
        youGet:
          'Single inbox for new work • Columns: type, requester, assignee, SLA, status • Views: all open, by assignee',
      },
      {
        prompt:
          'Track hiring pipeline with role, stage, recruiter, interviewer, and feedback',
        youGet:
          'Role-centric pipeline • Columns: role, stage, recruiter, next step • Kanban by stage plus table for reporting',
      },
    ],
  },
  {
    category: 'Inventory & Assets',
    lead: 'Equipment and stock levels with location and responsibility baked in.',
    items: [
      {
        prompt:
          'Log all company equipment with who has it, where it lives, and current status',
        youGet:
          'Asset register • Columns: asset, serial, custodian, location, status • Filter by site or owner',
      },
      {
        prompt:
          'Monitor inventory levels with location, reorder thresholds, and supplier',
        youGet:
          'Stock table with alerts • Columns: SKU, location, on hand, reorder point, supplier',
      },
    ],
  },
]

export default function Examples() {
  return (
    <motion.section
      id="examples"
      className="space-y-10 sm:space-y-14"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-4 text-center max-w-3xl mx-auto">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Type what you track—get columns, views, and filters
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base font-medium leading-relaxed">
          You describe the work in plain language. Trckr turns that into a
          structured tracker: the fields you need, table and board views, and
          ways to slice the list—without you designing a database first.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Featured example
        </p>
        <div className="relative max-w-2xl mx-auto">
          <LandingAxisFrame
            contentClassName={cn(
              theme.surface.secondarySubtle,
              'p-5 sm:p-7'
            )}
          >
            <Badge
              variant="outline"
              className={cn(
                'mb-3 text-[9px] uppercase tracking-widest sm:text-[10px]',
                theme.surface.badgeWash,
                theme.border.subtleAlt
              )}
            >
              {HERO_EXAMPLE.category}
            </Badge>
            <div className="space-y-2">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your prompt
              </p>
              <p className="text-sm sm:text-base text-foreground font-mono leading-relaxed">
                &ldquo;{HERO_EXAMPLE.prompt}&rdquo;
              </p>
            </div>
            <div
              className={cn(
                'mt-5 space-y-2 border-t pt-5',
                theme.border.verySubtle
              )}
            >
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Trckr builds
              </p>
              <p className="text-sm text-foreground font-medium leading-snug">
                {HERO_EXAMPLE.youGet.summary}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {HERO_EXAMPLE.youGet.detail}
              </p>
            </div>
          </LandingAxisFrame>
        </div>
      </div>

      <div className="space-y-10 max-w-4xl mx-auto">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          More prompts by area
        </p>
        {GROUPED_EXAMPLES.map((group) => (
          <div key={group.category} className="space-y-4">
            <div className="text-center md:text-left space-y-1.5 px-1">
              <h4 className="text-base sm:text-lg font-bold text-foreground">
                {group.category}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto md:mx-0 leading-relaxed">
                {group.lead}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.items.map((item) => (
                <LandingAxisFrame
                  key={item.prompt}
                  contentClassName={cn(
                    theme.surface.secondarySoft,
                    'p-4 sm:p-5'
                  )}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'mb-3 text-[9px] uppercase tracking-widest sm:text-[10px]',
                      theme.surface.badgeWash,
                      theme.border.subtleAlt
                    )}
                  >
                    {group.category}
                  </Badge>
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Your prompt
                  </p>
                  <p className="text-xs sm:text-sm text-foreground font-mono leading-relaxed">
                    &ldquo;{item.prompt}&rdquo;
                  </p>
                  <div
                    className={cn(
                      'mt-4 space-y-1.5 border-t pt-4',
                      theme.border.verySubtle
                    )}
                  >
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Trckr builds
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.youGet}
                    </p>
                  </div>
                </LandingAxisFrame>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-2">
        <Button
          size="lg"
          className={cn(theme.radius.md, 'px-6 text-sm sm:px-8 sm:text-base')}
          asChild
        >
          <a href="/login?callbackUrl=/tracker">Try with your own words →</a>
        </Button>
      </div>
    </motion.section>
  )
}
