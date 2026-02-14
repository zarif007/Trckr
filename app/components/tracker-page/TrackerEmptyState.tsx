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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 md:space-y-10"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 rounded-full"
        />
        <div className="relative w-16 h-16 rounded-md flex items-center justify-center bg-foreground shadow-xl">
          <Sparkles className="w-8 h-8 text-background" />
        </div>
      </div>

      <div className="text-center space-y-3">
        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          Build your <span className="relative inline-block">
            <span className="absolute inset-0 bg-primary -rotate-2 rounded-md" />
            <span className="relative px-2 text-primary-foreground">tracker.</span>
          </span>
        </h3>
        <p className="text-sm md:text-base text-muted-foreground/90 max-w-md mx-auto font-medium">
          What would you like to build today? <br />
          Describe your data needs in plain english.
        </p>
      </div>

      <div className="w-full max-w-3xl">
        {inputSlot}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-3xl">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            onClick={() => onApplySuggestion(suggestion.query)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 transition-all text-left shadow-sm"
          >
            <span className={`text-xs ${suggestion.iconColor}`}>
              <suggestion.icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
              {suggestion.summary ?? suggestion.title}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}
