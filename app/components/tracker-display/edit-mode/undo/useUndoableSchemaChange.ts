'use client'

import { useRef, useCallback, useState } from 'react'
import type { TrackerDisplayProps } from '../../types'

export interface UseUndoableSchemaChangeOptions {
  /** Maximum number of undo steps to keep. Default 50. */
  maxHistorySize?: number
}

export interface UseUndoableSchemaChangeResult {
  onSchemaChange: (next: TrackerDisplayProps) => void
  undo: () => void
  canUndo: boolean
}

/**
 * Wraps onSchemaChange with an undo stack. Push current schema before each
 * change; undo() pops and applies the previous schema.
 * Use when edit mode is on; pass the returned onSchemaChange to the display.
 */
export function useUndoableSchemaChange(
  schema: TrackerDisplayProps,
  onSchemaChange: (next: TrackerDisplayProps) => void,
  options: UseUndoableSchemaChangeOptions = {}
): UseUndoableSchemaChangeResult {
  const { maxHistorySize = 50 } = options
  const historyRef = useRef<TrackerDisplayProps[]>([])
  const isUndoRef = useRef(false)

  const [canUndo, setCanUndo] = useState(false)

  const wrappedOnSchemaChange = useCallback(
    (next: TrackerDisplayProps) => {
      if (!isUndoRef.current) {
        const stack = historyRef.current
        stack.push(schema)
        if (stack.length > maxHistorySize) stack.shift()
        setCanUndo(stack.length > 0)
      }
      isUndoRef.current = false
      onSchemaChange(next)
    },
    [schema, onSchemaChange, maxHistorySize]
  )

  const undo = useCallback(() => {
    const stack = historyRef.current
    const prev = stack.pop()
    setCanUndo(stack.length > 0)
    if (prev) {
      isUndoRef.current = true
      onSchemaChange(prev)
    }
  }, [onSchemaChange])

  return {
    onSchemaChange: wrappedOnSchemaChange,
    undo,
    canUndo,
  }
}
