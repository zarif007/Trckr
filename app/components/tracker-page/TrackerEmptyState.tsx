'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { suggestions, dataSuggestions } from '@/app/tracker/hooks/constants'

interface TrackerEmptyStateProps {
 onApplySuggestion: (query: string) => void
 inputSlot?: ReactNode
 mode?: 'schema' | 'data'
}

export function TrackerEmptyState({
 onApplySuggestion,
 inputSlot,
 mode = 'schema',
}: TrackerEmptyStateProps) {
 const isDataMode = mode === 'data'
 const heading = isDataMode ? 'Ask about your tracker' : 'Build your tracker'
 const subtitle = isDataMode
 ? 'Ask for summaries, insights, or suggestions from the data'
 : 'Describe what you need in plain English.'
 const list = isDataMode ? dataSuggestions : suggestions

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
 <div className="w-12 h-12 rounded-sm flex items-center justify-center bg-foreground/95 ring-1 ring-foreground/10">
 <Sparkles className="w-6 h-6 text-background" />
 </div>
 </div>

 <div className="text-center space-y-2">
 <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
 {isDataMode ? (
 <>
 Understand your <span className="text-foreground/90">tracker data</span>
 </>
 ) : (
 <>
 Build your <span className="text-foreground/90">tracker</span>
 </>
 )}
 </h2>
 <p className="text-sm text-muted-foreground max-w-sm mx-auto">
 {subtitle}
 </p>
 </div>

 <div className="w-full">
 {inputSlot}
 </div>

 <div className="flex flex-wrap items-center justify-center gap-2 w-full">
 {list.map((suggestion) => (
 <button
 key={suggestion.title}
 onClick={() => onApplySuggestion(suggestion.query)}
 className="group flex items-center gap-2 px-3 py-2 rounded-sm border border-border/30 bg-background/60 hover:bg-muted/30 hover:border-border/50 transition-all duration-150 text-left"
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
