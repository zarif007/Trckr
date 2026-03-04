'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { suggestions } from '@/app/tracker/hooks/useTrackerChat'

interface TrackerEmptyStateProps {
  onApplySuggestion: (query: string) => void
  inputSlot?: ReactNode
}

export function TrackerEmptyState({ onApplySuggestion, inputSlot }: TrackerEmptyStateProps) {
  return (
    <motion.div
      key="empty-state"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 md:space-y-12"
    >
      <div className="relative">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-foreground shadow-lg">
          <Sparkles className="w-7 h-7 text-background" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Build your <span className="text-foreground/90">tracker</span>
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Describe what you need in plain English.
        </p>
      </div>

      <div className="w-full">
        {inputSlot}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 w-full">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            onClick={() => onApplySuggestion(suggestion.query)}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background/80 hover:bg-muted/50 hover:border-foreground/15 transition-all text-left"
          >
            <span className={`text-xs ${suggestion.iconColor}`}>
              <suggestion.icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {suggestion.summary ?? suggestion.title}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all duration-200" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}
