'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ClaiLine } from './types'

export interface ClaiPanelProps {
  lines: ClaiLine[]
  location: string
  onSubmit: (value: string) => void
  className?: string
}

/** Format location for prompt: ~/dashboard/projects → display as path */
function formatPromptLocation(location: string): string {
  const trimmed = location.replace(/^\/+|\/+$/g, '') || 'dashboard'
  return trimmed === 'dashboard' ? '~' : `~/${trimmed}`
}

export function ClaiPanel({ lines, location, onSubmit, className }: ClaiPanelProps) {
  const outputEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const displayLocation = formatPromptLocation(location)

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const val = inputRef.current?.value.trim()
    if (!val) return
    onSubmit(val)
    inputRef.current!.value = ''
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg',
        'bg-[#0a0a0b] text-[#e4e4e7] font-mono text-[13px] antialiased',
        'border border-white/[0.06] shadow-2xl',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {lines.map((line) => (
            <div key={line.id} className="animate-in fade-in duration-200">
              <div
                className={cn(
                  'rounded-md transition-colors',
                  line.type === 'command' && 'bg-white/[0.04] border border-white/[0.06] px-3 py-2.5',
                  line.type === 'system' && 'text-[#71717a] text-xs',
                  line.type === 'error' && 'text-[#f87171]',
                  line.type === 'text' && 'pl-1 text-[#a1a1aa]'
                )}
              >
                {line.type === 'command' && (
                  <span className="mr-2 text-[#22d3ee]">›</span>
                )}
                <span className="whitespace-pre-wrap break-words">{line.content}</span>
              </div>
            </div>
          ))}
        </div>
        <div ref={outputEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#070708] px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] text-[#71717a]">{displayLocation}</span>
          <span className="text-[#52525b]">›</span>
          <Input
            ref={inputRef}
            autoFocus
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-1.5 text-[13px] text-white shadow-none placeholder:text-[#52525b] focus-visible:ring-0"
            placeholder="Ask or run a command..."
          />
          <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-[#71717a] sm:inline-block">
            ↵
          </kbd>
        </form>
      </div>
    </div>
  )
}