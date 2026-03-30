'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, EyeOff, Link2, Wand2, Lightbulb } from 'lucide-react'
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
      className="space-y-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
        {/* Copy */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-foreground/50" strokeWidth={2} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Intelligence
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              Formulas, rules, and bindings — built visually.
            </h3>
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              Build smart fields without writing a line of code. Conditional logic, computed
              values, and live bindings — all visual.
            </p>
          </div>

          {/* 2×2 feature icon cards */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.08 + idx * 0.05 }}
                className={cn(
                  'flex flex-col gap-3 rounded-md border p-4 transition-colors duration-150',
                  theme.border.subtle,
                  theme.surface.secondarySubtle
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded border',
                    theme.border.subtle,
                    theme.surface.background
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-foreground/50" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground/85 leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground/65 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
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
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <div
            className={cn(
              'overflow-hidden rounded-md border bg-background shadow-xs transition-shadow duration-300',
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
