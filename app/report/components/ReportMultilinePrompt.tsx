'use client'

import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Native multiline prompt — avoids shared Textarea + `input-field-height`,
 * which locks height to a single-line field token.
 */
export function ReportMultilinePrompt({
  className,
  rows = 3,
  style,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="report-multiline-prompt"
      rows={rows}
      className={cn(
        'block w-full box-border py-3 px-4 text-base leading-relaxed text-foreground caret-foreground',
        'resize-y border-0 bg-transparent',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{
        /* ~3 text lines + vertical padding; stays multiline without theme input-field-height */
        minHeight: '6.25rem',
        ...style,
      }}
      {...props}
    />
  )
}
