'use client'

import { motion } from 'framer-motion'
import { MessageSquare, BarChart3, FileText, ShieldCheck } from 'lucide-react'
import { AnalysisDocumentView } from '@/app/analysis/components/AnalysisDocumentView'
import {
  LANDING_DEMO_ANALYSIS_DOCUMENT,
  LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
} from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const FEATURES: {
  icon: React.ElementType
  label: string
  desc: string
}[] = [
  {
    icon: MessageSquare,
    label: 'Ask in plain English',
    desc: '"Which projects are over budget?" — answered instantly',
  },
  {
    icon: BarChart3,
    label: 'Charts & trends',
    desc: 'Auto-generated from your actual data',
  },
  {
    icon: FileText,
    label: 'Full reports',
    desc: 'Summaries, analysis, and action items',
  },
  {
    icon: ShieldCheck,
    label: 'Grounded in your data',
    desc: 'Zero hallucination — your rows only',
  },
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
        {/* Live demo (left) */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div
            className={cn(
              'overflow-hidden rounded-md border bg-background max-h-[min(60vh,540px)] overflow-y-auto',
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
          className="lg:col-span-2 space-y-5 lg:pt-3"
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
              Ask a plain question. Get a full report — summaries, charts, trends, and action
              items — grounded entirely in your tracker data.
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
            AI-native. No exports needed.
          </span>
        </motion.div>
      </div>
    </motion.section>
  )
}
