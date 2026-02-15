'use client'

import { useState, useCallback } from 'react'
import type { TrackerDisplayProps } from '../types'

/**
 * Hook to hold editable tracker schema state for create/edit pages (from-scratch, full-page edit).
 * Returns current schema and a change handler suitable for TrackerDisplay's onSchemaChange.
 */
export function useEditableTrackerSchema(
  initialSchema: TrackerDisplayProps
): {
  schema: TrackerDisplayProps
  onSchemaChange: (next: TrackerDisplayProps) => void
} {
  const [schema, setSchema] = useState<TrackerDisplayProps>(initialSchema)

  const onSchemaChange = useCallback((next: TrackerDisplayProps) => {
    setSchema(next)
  }, [])

  return { schema, onSchemaChange }
}
