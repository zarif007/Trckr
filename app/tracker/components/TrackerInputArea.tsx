'use client'

import { motion } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { quickSuggestions } from '../hooks/useTrackerChat'

interface TrackerInputAreaProps {
  input: string
  setInput: (v: string) => void
  isFocused: boolean
  setIsFocused: (v: boolean) => void
  handleSubmit: () => void
  applySuggestion: (s: string) => void
  isLoading: boolean
  isChatEmpty: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  variant?: 'default' | 'hero'
}

export function TrackerInputArea({
  input,
  setInput,
  isFocused,
  setIsFocused,
  handleSubmit,
  applySuggestion,
  isLoading,
  isChatEmpty,
  textareaRef,
  variant = 'default',
}: TrackerInputAreaProps) {
  const isHero = variant === 'hero'
  return (
    <div className={isHero ? 'space-y-4' : 'space-y-3'}>
      {!isChatEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1"
        >
          {quickSuggestions.map((s) => (
            <button
              key={s.text}
              onClick={() => applySuggestion(s.text)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-md hover:bg-card hover:border-primary/50 transition-all whitespace-nowrap shadow-sm"
            >
              <span className="text-sm group-hover:scale-110 transition-transform">{s.icon}</span>
              <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
                {s.text}
              </span>
            </button>
          ))}
        </motion.div>
      )}

      <div className="relative group">
        <motion.div
          className={`absolute -inset-[1px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm ${isFocused ? 'opacity-100' : ''}`}
        />

        <div
          className={`relative bg-card rounded-md shadow-xl border border-border/50 overflow-hidden border-2 border-muted/100 ${isHero ? 'rounded-[18px] shadow-2xl border-border/70' : ''}`}
        >
          <div className={`flex items-end gap-2 ${isHero ? 'p-3 md:p-4' : 'p-1.5'}`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
                if (e.key === 'Escape') {
                  setIsFocused(false)
                  textareaRef.current?.blur()
                }
              }}
              placeholder={isChatEmpty ? 'Describe your ideal tracker...' : 'Ask for changes or refinements...'}
              rows={1}
              className={`flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none max-h-[200px] ${isHero ? 'text-base min-h-[72px]' : 'px-3 py-3 text-sm font-medium min-h-[44px]'}`}
            />

            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={`shrink-0 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed rounded-md ${isHero ? 'h-12 w-12' : 'h-10 w-10'} ${input.trim() && !isLoading
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-secondary text-muted-foreground'
                }`}
            >
              {isLoading ? (
                <Loader2 className={`${isHero ? 'w-5 h-5' : 'w-4 h-4'} animate-spin`} />
              ) : (
                <Send className={isHero ? 'w-5 h-5' : 'w-4 h-4'} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
