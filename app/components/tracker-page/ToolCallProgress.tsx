'use client'

import { motion } from 'framer-motion'
import { Wrench, Check, X, Loader2 } from 'lucide-react'
import type { ToolCallEntry } from '@/app/tracker/hooks/useTrackerChat'

interface ToolCallProgressProps {
  toolCalls: ToolCallEntry[]
}

function StatusIcon({ status }: { status: ToolCallEntry['status'] }) {
  switch (status) {
    case 'done':
      return <Check className="h-3 w-3 text-emerald-500 shrink-0" />
    case 'error':
      return <X className="h-3 w-3 text-destructive shrink-0" />
    case 'running':
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
    default:
      return <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
  }
}

function purposeLabel(purpose: 'validation' | 'calculation') {
  return purpose === 'calculation' ? 'Calculate' : 'Validate'
}

export function ToolCallProgress({ toolCalls }: ToolCallProgressProps) {
  if (!toolCalls.length) return null

  const done = toolCalls.filter((t) => t.status === 'done').length
  const total = toolCalls.length
  const allDone = done === total
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2.5 min-w-0"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Expression Agent
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {done}/{total}
        </span>
      </div>

      <div className="h-1 w-full rounded-full bg-border/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-foreground/60"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        {toolCalls.map((tc) => (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-2.5 text-xs p-1.5 rounded-md min-w-0 ${
              tc.status === 'done'
                ? 'text-foreground/60'
                : tc.status === 'error'
                  ? 'text-destructive/80 bg-destructive/5'
                  : tc.status === 'running'
                    ? 'text-foreground bg-blue-500/5'
                    : 'text-muted-foreground'
            }`}
          >
            <StatusIcon status={tc.status} />
            <span className="font-medium shrink-0">{purposeLabel(tc.purpose)}</span>
            <span className="text-muted-foreground truncate font-mono text-[11px]">
              {tc.fieldPath}
            </span>
            {tc.status === 'running' && !allDone && (
              <span className="ml-auto text-[10px] text-blue-500/70 shrink-0">
                generating...
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
