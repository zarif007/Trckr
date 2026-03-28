'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { ExprFlowBuilder } from '@/app/components/tracker-display/edit-mode/expr/ExprFlowBuilder'
import {
  LANDING_DEMO_EXPR_FIELDS,
  LANDING_DEMO_EXPR_RESULT_LABEL,
  LANDING_DEMO_INITIAL_EXPR,
} from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import type { ExprNode } from '@/lib/functions/types'

const BULLETS = [
  'Computed fields update live as data changes',
  'Show, require, or disable fields conditionally',
  'Dropdowns powered by live data from other trackers',
  'AI writes formula logic from plain language',
]

export default function IntelligenceSpotlight() {
  const [expr, setExpr] = useState<ExprNode>(LANDING_DEMO_INITIAL_EXPR)

  return (
    <motion.section
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        {/* Copy */}
        <motion.div
          className="lg:col-span-2 space-y-4 lg:pt-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Intelligence
            </p>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Formulas, rules, and bindings — built visually.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build smart fields without writing a single line. Conditional logic, computed values, and live dropdown bindings — all visual, all no-code.
            </p>
          </div>

          <ul className="space-y-2">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-xs text-muted-foreground/80">
                <span
                  className={cn(
                    'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                    theme.surface.secondarySubtle
                  )}
                >
                  <Check className="h-2 w-2 text-foreground/50" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/55',
              theme.border.subtle,
              theme.surface.secondarySubtle
            )}
          >
            No code. No SQL. No exports.
          </span>
        </motion.div>

        {/* Component */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div
            className={cn(
              'rounded-md overflow-hidden border bg-background',
              theme.border.subtle
            )}
          >
            <ExprFlowBuilder
              key="intelligence-spotlight"
              expr={expr}
              availableFields={LANDING_DEMO_EXPR_FIELDS}
              onChange={setExpr}
              resultFieldId="logic_lines_grid.logic_line_total"
              resultFieldLabel={LANDING_DEMO_EXPR_RESULT_LABEL}
              flowHeightClassName="h-[min(48vh,480px)]"
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
