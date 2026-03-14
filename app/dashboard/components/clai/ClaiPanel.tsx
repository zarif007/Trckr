'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { cliTheme as cli } from './cliTheme'
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

const SUCCESS_PATTERNS = [
  '✓',
  '✔',
  'success',
  'running',
  'done',
  'ready',
  'passed',
]
function isSuccessSystemLine(content: string): boolean {
  const lower = content.toLowerCase()
  return SUCCESS_PATTERNS.some((p) => lower.includes(p.toLowerCase()) || content.includes(p))
}

const KV_ROW = /^([A-Za-z0-9_-]+)\s*:\s*(.+)$/

/** Heuristic: content has "Key: value" lines (first line optional title, rest Label: value). */
function parseKeyValueBlock(content: string): { title?: string; rows: { label: string; value: string }[] } | null {
  const lines = content.split('\n').map((s) => s.trim()).filter(Boolean)
  if (lines.length === 0) return null
  const rows: { label: string; value: string }[] = []
  let title: string | undefined
  let i = 0
  if (lines.length > 0 && !KV_ROW.test(lines[0])) {
    title = lines[0]
    i = 1
  }
  for (; i < lines.length; i++) {
    const m = lines[i].match(KV_ROW)
    if (!m) return null
    rows.push({ label: m[1], value: m[2].trim() })
  }
  if (rows.length === 0) return null
  return { title, rows }
}

const STATUS_VALUES = ['running', 'done', 'ready', 'success', 'active', 'ok']
function isStatusValue(value: string): boolean {
  const v = value.toLowerCase().trim()
  return STATUS_VALUES.some((s) => v === s || v.startsWith(s + ' ') || v.endsWith(' ' + s))
}

function LineBlock({ line }: { line: ClaiLine }) {
  const isSuccess = line.type === 'system' && isSuccessSystemLine(line.content)

  if (line.type === 'command') {
    return (
      <div
        className="animate-in fade-in duration-200 flex font-mono text-[13px] leading-relaxed border-l-2 pl-3 py-0.5"
        style={{ borderColor: cli.border }}
      >
        <span style={{ color: cli.promptMuted }} className="select-none shrink-0">
          $
        </span>
        <span className="ml-2 shrink-0 font-medium" style={{ color: cli.text }}>
          <span className="whitespace-pre-wrap break-words">{line.content}</span>
        </span>
      </div>
    )
  }
  if (line.type === 'system') {
    const showCheck = isSuccess && !/^[✔✓]/.test(line.content.trim())
    return (
      <div
        className="animate-in fade-in duration-200 pl-5 font-mono text-[13px] leading-relaxed"
        style={{ color: isSuccess ? cli.success : cli.textMuted }}
      >
        {showCheck && <span className="mr-1.5">✔</span>}
        <span className="whitespace-pre-wrap break-words">{line.content}</span>
      </div>
    )
  }
  if (line.type === 'error') {
    return (
      <div
        className="animate-in fade-in duration-200 rounded border px-4 py-3 font-mono text-[13px] leading-relaxed"
        style={{
          color: cli.error,
          backgroundColor: cli.errorBg,
          borderColor: cli.errorBorder,
        }}
      >
        <span className="whitespace-pre-wrap break-words">{line.content}</span>
      </div>
    )
  }
  // text (assistant / info block) — optional key-value layout
  const kv = parseKeyValueBlock(line.content)
  if (kv && kv.rows.length > 0) {
    const title = kv.title ?? 'Info'
    return (
      <div
        className="animate-in fade-in duration-200 rounded border px-4 py-4 font-mono text-[13px] leading-[1.65]"
        style={{
          color: cli.text,
          backgroundColor: cli.panelBg,
          borderColor: cli.border,
        }}
      >
        <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: cli.promptMuted }}>
          {title}
        </div>
        <div className="space-y-1.5">
          {kv.rows.map(({ label, value }, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span style={{ color: cli.textMuted }}>{label}</span>
              <span style={{ color: isStatusValue(value) ? cli.success : cli.text }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div
      className="animate-in fade-in duration-200 rounded border px-4 py-4 font-mono text-[13px] leading-[1.65]"
      style={{
        color: cli.text,
        backgroundColor: cli.panelBg,
        borderColor: cli.border,
      }}
    >
      <span className="whitespace-pre-wrap break-words">{line.content}</span>
    </div>
  )
}

const SCROLLBAR_STYLES = `
  [&::-webkit-scrollbar]:w-2
  [&::-webkit-scrollbar-track]:bg-transparent
  [&::-webkit-scrollbar-thumb]:rounded-full
  [&::-webkit-scrollbar-thumb]:bg-white/10
  [&::-webkit-scrollbar-thumb]:hover:bg-white/15
`

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
        'flex h-full w-full flex-col overflow-hidden rounded-b-xl',
        'font-mono text-[13px] antialiased',
        className
      )}
      style={{ backgroundColor: cli.bg, color: cli.text }}
    >
      <div
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          SCROLLBAR_STYLES
        )}
        style={{ padding: '24px 28px' }}
      >
        <div className="space-y-6">
          {lines.map((line) => (
            <LineBlock key={line.id} line={line} />
          ))}
        </div>
        <div ref={outputEndRef} className="h-4 min-h-4" />
      </div>

      {/* Input: user@clai path › $ with hint */}
      <div
        className="flex-shrink-0 border-t px-6 py-4"
        style={{ borderColor: cli.border }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[13px]" style={{ color: cli.promptMuted }}>
              user@clai
            </span>
            <span className="shrink-0 font-mono text-[13px]" style={{ color: cli.textMuted }}>
              {displayLocation}
            </span>
            <span className="shrink-0 font-mono text-[13px]" style={{ color: cli.promptMuted }}>
              ›
            </span>
            <span className="shrink-0 font-mono text-[13px] font-medium" style={{ color: cli.text }}>
              $
            </span>
            <Input
              ref={inputRef}
              autoFocus
              className={cn(
                'min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-[13px] leading-7 shadow-none',
                'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
                'placeholder:font-normal'
              )}
              style={{ color: cli.text, caretColor: cli.caret }}
              placeholder="Ask or run a command..."
            />
          </div>
          <p
            className="font-mono text-[11px] pl-0"
            style={{ color: cli.promptMuted }}
          >
            Tab to complete · ⌘↩ to submit
          </p>
        </form>
      </div>
    </div>
  )
}
