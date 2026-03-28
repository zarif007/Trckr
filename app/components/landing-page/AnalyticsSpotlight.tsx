'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { AnalysisDocumentView } from '@/app/analysis/components/AnalysisDocumentView'
import {
  LANDING_DEMO_ANALYSIS_DOCUMENT,
  LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
} from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const BULLETS = [
  'Plain-language questions, structured answers',
  'Summaries, charts, and trend analysis in one report',
  'Action items and recommendations from your data',
  'Zero hallucination — grounded entirely in your rows',
]

export default function AnalyticsSpotlight() {
  return (
    <motion.section
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        {/* Component (left) */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div
            className={cn(
              'rounded-md border bg-background max-h-[min(60vh,540px)] overflow-y-auto',
              theme.border.subtle
            )}
          >
            <AnalysisDocumentView
              document={LANDING_DEMO_ANALYSIS_DOCUMENT}
              header={{
                title: 'Pipeline concentration',
                asOfIso: LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
                projectName: 'Northwind Ops',
                moduleName: 'Go-to-market',
                trackerName: 'Project pipeline',
              }}
            />
          </div>
        </motion.div>

        {/* Copy (right) */}
        <motion.div
          className="lg:col-span-2 space-y-4 lg:pt-3"
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              AI Analysis
            </p>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Project reports, written by AI.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask a plain question. Get a full report — summaries, charts, trends, and action items — grounded entirely in your tracker data.
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
            AI-native. No exports needed.
          </span>
        </motion.div>
      </div>
    </motion.section>
  )
}
