'use client'

import { useEffect } from 'react'

/**
 * Registers a global Ctrl+Z / Cmd+Z shortcut that calls undo when edit mode
 * is active and undo is available. Use once per view (e.g. in the toolbar).
 */
export function useUndoKeyboardShortcut(
  editMode: boolean,
  canUndo: boolean,
  undo: (() => void) | undefined
): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (editMode && canUndo && undo) undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editMode, canUndo, undo])
}
