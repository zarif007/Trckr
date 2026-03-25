'use client'

import { useRef, useEffect, type FormEvent, type ReactNode } from 'react'
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

type PanelStatus = 'ready' | 'working' | 'idle'
function getPanelStatus(lines: ClaiLine[]): PanelStatus {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.type !== 'system') continue
    const c = line.content.toLowerCase()
    if (c.includes('running') || c.includes('working') || c.includes('loading')) return 'working'
    if (isSuccessSystemLine(line.content)) return 'ready'
  }
  return 'idle'
}

function StatusChip({ status }: { status: PanelStatus }) {
  const map: Record<PanelStatus, { label: string; fg: string; bg: string; border: string }> = {
    ready: { label: 'Ready', fg: cli.success, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.22)' },
    working: { label: 'Working', fg: cli.link, bg: 'rgba(125,211,252,0.08)', border: 'rgba(125,211,252,0.20)' },
    idle: { label: 'Idle', fg: cli.textMuted, bg: 'rgba(255,255,255,0.05)', border: cli.border },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] tracking-wide"
      style={{ color: s.fg, backgroundColor: s.bg, borderColor: s.border }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.fg, boxShadow: `0 0 0 2px ${s.bg}` }}
      />
      {s.label}
    </span>
  )
}

function PanelHeader({ status }: { status: PanelStatus }) {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b px-6 py-4"
      style={{ borderColor: cli.border, backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div className="min-w-0">
        <div className="text-[12px] font-semibold tracking-wide" style={{ color: cli.text }}>
          CLAI Control Panel
        </div>
        <div className="mt-0.5 text-[11px] leading-4" style={{ color: cli.textMuted }}>
          Commands, output, and system status
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusChip status={status} />
      </div>
    </div>
  )
}

function CardShell({
  children,
  accent,
  className,
}: {
  children: ReactNode
  accent?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-md border', className)} style={{ borderColor: cli.border, backgroundColor: cli.panelBg }}>
      <div className="flex gap-3 px-4 py-3">
        <div className="w-[2px] shrink-0 rounded-full" style={{ backgroundColor: accent ?? 'transparent' }} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function LineBlock({ line }: { line: ClaiLine }) {
  const isSuccess = line.type === 'system' && isSuccessSystemLine(line.content)

  if (line.type === 'command') {
    return (
      <div className="animate-in fade-in duration-200">
        <CardShell accent={cli.success} className="bg-transparent">
          <div className="flex items-start gap-2 font-mono text-[13px] leading-relaxed">
            <span style={{ color: cli.promptMuted }} className="select-none shrink-0 pt-[1px]">
              $
            </span>
            <span className="min-w-0 font-medium" style={{ color: cli.text }}>
              <span className="whitespace-pre-wrap break-words">{line.content}</span>
            </span>
          </div>
        </CardShell>
      </div>
    )
  }
  if (line.type === 'system') {
    const showCheck = isSuccess && !/^[✔✓]/.test(line.content.trim())
    return (
      <div className="animate-in fade-in duration-200">
        <CardShell accent={isSuccess ? cli.success : cli.border}>
          <div className="flex items-start gap-2 font-mono text-[13px] leading-relaxed">
            {showCheck && (
              <span className="shrink-0 pt-[1px]" style={{ color: cli.success }}>
                ✔
              </span>
            )}
            <span className="min-w-0 whitespace-pre-wrap break-words" style={{ color: isSuccess ? cli.success : cli.textMuted }}>
              {line.content}
            </span>
          </div>
        </CardShell>
      </div>
    )
  }
  if (line.type === 'error') {
    return (
      <div className="animate-in fade-in duration-200">
        <div
          className="rounded-md border px-4 py-3"
          style={{
            color: cli.error,
            backgroundColor: cli.errorBg,
            borderColor: cli.errorBorder,
          }}
        >
          <div className="mb-1 text-[11px] uppercase tracking-wider" style={{ color: cli.error }}>
            Error
          </div>
          <div className="font-mono text-[13px] leading-relaxed">
            <span className="whitespace-pre-wrap break-words">{line.content}</span>
          </div>
        </div>
      </div>
    )
  }
  // text (assistant / info block) — optional key-value layout
  const kv = parseKeyValueBlock(line.content)
  if (kv && kv.rows.length > 0) {
    const title = kv.title ?? 'Info'
    return (
      <div className="animate-in fade-in duration-200">
        <div
          className="rounded-md border px-4 py-4"
          style={{
            color: cli.text,
            backgroundColor: cli.panelBg,
            borderColor: cli.border,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: cli.promptMuted }}>
              {title}
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-y-2">
            {kv.rows.map(({ label, value }, i) => {
              const statusish = isStatusValue(value)
              return (
                <div key={i} className="flex items-start justify-between gap-6">
                  <dt className="min-w-0 truncate text-[12px]" style={{ color: cli.textMuted }}>
                    {label}
                  </dt>
                  <dd className="flex shrink-0 items-center gap-2">
                    {statusish && (
                      <span
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]"
                        style={{
                          color: cli.success,
                          borderColor: 'rgba(34,197,94,0.25)',
                          backgroundColor: 'rgba(34,197,94,0.08)',
                        }}
                      >
                        {value}
                      </span>
                    )}
                    {!statusish && (
                      <span className="text-[12px]" style={{ color: cli.text }}>
                        {value}
                      </span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    )
  }
  return (
    <div className="animate-in fade-in duration-200">
      <div
        className="rounded-md border px-4 py-4 font-mono text-[13px] leading-[1.65]"
        style={{
          color: cli.text,
          backgroundColor: cli.panelBg,
          borderColor: cli.border,
        }}
      >
        <span className="whitespace-pre-wrap break-words">{line.content}</span>
      </div>
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
  const status = getPanelStatus(lines)

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const val = inputRef.current?.value.trim()
    if (!val) return
    onSubmit(val)
    inputRef.current!.value = ''
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-b-md',
        'text-[13px] antialiased',
        className
      )}
      style={{ backgroundColor: cli.bg, color: cli.text }}
    >
      <PanelHeader status={status} />
      <div
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          SCROLLBAR_STYLES
        )}
        style={{ padding: '18px 24px' }}
      >
        <div className="space-y-3">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 rounded-md border px-3 py-2 transition-colors"
            style={{ borderColor: cli.border, backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <Input
              ref={inputRef}
              autoFocus
              className={cn(
                'min-w-0 flex-1 border-0 bg-transparent px-0 py-1.5 text-[13px] leading-6 shadow-none',
                'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
                'placeholder:font-normal'
              )}
              style={{ color: cli.text, caretColor: cli.caret }}
              placeholder="Type a command or ask CLAI…"
            />
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px]" style={{ color: cli.promptMuted }}>
            <span>⌘↩ to submit</span>
            <span className="hidden sm:inline">Shift+Esc to blur</span>
          </div>
        </form>
      </div>
    </div>
  )
}
