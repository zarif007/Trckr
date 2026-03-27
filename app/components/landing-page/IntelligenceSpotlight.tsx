'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExprFlowBuilder } from '@/app/components/tracker-display/edit-mode/expr/ExprFlowBuilder'
import {
  LANDING_DEMO_EXPR_FIELDS,
  LANDING_DEMO_INITIAL_EXPR,
} from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import type { ExprNode } from '@/lib/functions/types'

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
          className="lg:col-span-2 space-y-3 lg:pt-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Intelligence
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            Formulas, rules, and bindings — built visually.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Computed fields. Conditional show, require, and disable. Dropdowns backed by live grids. No code.
          </p>
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
              resultFieldLabel="Line total"
              flowHeightClassName="h-[min(36vh,360px)]"
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
