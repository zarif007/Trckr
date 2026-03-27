'use client'

import { motion } from 'framer-motion'
import { AnalysisDocumentView } from '@/app/analysis/components/AnalysisDocumentView'
import { LANDING_DEMO_ANALYSIS_DOCUMENT } from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

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
                asOfIso: null,
                projectName: 'Demo org',
                moduleName: 'Go-to-market',
                trackerName: 'Project pipeline',
              }}
            />
          </div>
        </motion.div>

        {/* Copy (right) */}
        <motion.div
          className="lg:col-span-2 space-y-3 lg:pt-3"
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Analyst
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            Your data already knows the answers.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ask plain questions. Get summaries, trends, and suggestions — grounded in your actual rows.
          </p>
          <ul className="mt-1 space-y-1.5">
            {[
              'Plain language questions, structured answers',
              'Summaries, trends, and suggestions',
              'Grounded in your actual rows — no hallucination',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                <span className="mt-[0.4em] inline-flex h-1 w-1 flex-shrink-0 rounded-full bg-foreground/25" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </motion.section>
  )
}
