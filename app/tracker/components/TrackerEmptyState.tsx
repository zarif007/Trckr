'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { suggestions } from '../hooks/useTrackerChat'

interface TrackerEmptyStateProps {
  onApplySuggestion: (query: string) => void
}

export function TrackerEmptyState({ onApplySuggestion }: TrackerEmptyStateProps) {
  return (
    <motion.div
      key="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-12"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            onClick={() => onApplySuggestion(suggestion.query)}
            className="relative p-4 rounded-md border border-border/50 bg-card hover:bg-card/80 hover:border-primary/40 transition-all text-left group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-md bg-background/50 backdrop-blur-sm ${suggestion.iconColor} border border-current/20`}>
                  <suggestion.icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {suggestion.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {suggestion.desc}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
