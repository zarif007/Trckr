'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, EyeOff, Link2, Wand2 } from 'lucide-react'
import { ExprFlowBuilder } from '@/app/components/tracker-display/edit-mode/expr/ExprFlowBuilder'
import {
  LANDING_DEMO_EXPR_FIELDS,
  LANDING_DEMO_EXPR_RESULT_LABEL,
  LANDING_DEMO_INITIAL_EXPR,
} from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import type { ExprNode } from '@/lib/functions/types'

const FEATURES: {
  icon: React.ElementType
  label: string
  desc: string
}[] = [
  {
    icon: Calculator,
    label: 'Computed fields',
    desc: 'Update live as row data changes',
  },
  {
    icon: EyeOff,
    label: 'Conditional logic',
    desc: 'Show, require, or disable by rule',
  },
  {
    icon: Link2,
    label: 'Live bindings',
    desc: 'Dropdowns backed by other trackers',
  },
  {
    icon: Wand2,
    label: 'AI-generated',
    desc: 'Describe it — AI writes the formula',
  },
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
          className="lg:col-span-2 space-y-5 lg:pt-3"
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
              Build smart fields without writing a line of code. Conditional logic, computed
              values, and live bindings — all visual.
            </p>
          </div>

          {/* 2×2 feature icon cards */}
          <div className="grid grid-cols-2 gap-2">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className={cn(
                  'flex flex-col gap-2 rounded-md border p-3',
                  theme.border.subtle,
                  theme.surface.secondarySubtle
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded border',
                    theme.border.subtle,
                    theme.surface.background
                  )}
                >
                  <Icon className="h-3 w-3 text-foreground/50" strokeWidth={1.5} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground/80 leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50',
              theme.border.subtle,
              theme.surface.secondarySubtle
            )}
          >
            No code. No SQL. No exports.
          </span>
        </motion.div>

        {/* Live demo */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div
            className={cn(
              'overflow-hidden rounded-md border bg-background',
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
