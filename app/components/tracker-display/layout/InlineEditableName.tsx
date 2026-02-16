'use client'

import { useState, useRef, useEffect } from 'react'

export interface InlineEditableNameProps {
  value: string
  onChange: (name: string) => void
  /** Optional class for the static span (e.g. text-base font-semibold). */
  className?: string
}

/**
 * Inline editable name: click to edit, Enter/blur to save.
 * Used for section and grid names in edit mode.
 */
export function InlineEditableName({
  value,
  onChange,
  className = 'text-base font-semibold text-foreground hover:text-primary cursor-text transition-colors text-left truncate leading-7',
}: InlineEditableNameProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={className}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setEditing(true)
        }}
        title="Click to rename"
      >
        {value}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      className="text-base font-semibold text-foreground bg-transparent border-b border-primary/50 outline-none w-full leading-7"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim()
        if (trimmed && trimmed !== value) onChange(trimmed)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const trimmed = draft.trim()
          if (trimmed && trimmed !== value) onChange(trimmed)
          setEditing(false)
        }
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}
