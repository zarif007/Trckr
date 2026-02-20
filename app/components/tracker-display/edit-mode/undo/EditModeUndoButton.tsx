'use client'

import { Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface EditModeUndoButtonProps {
  /** Called when the user clicks Undo or uses Ctrl+Z. */
  undo: (() => void) | undefined
  /** Whether there is a step to undo. Button is disabled when false. */
  canUndo: boolean
  /** When false, the button is not rendered. */
  visible?: boolean
  /** Optional class name for the button. */
  className?: string
  /** Button variant. Default outline. */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** Button size. Default sm. */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Accessible label. Default "Undo (Ctrl+Z)". */
  ariaLabel?: string
  /** Tooltip. Default "Undo (Ctrl+Z)". */
  title?: string
}

/**
 * Button that triggers undo in edit mode. Renders nothing when undo is
 * undefined or visible is false. Use with useUndoableSchemaChange and
 * useUndoKeyboardShortcut for full behavior.
 */
export function EditModeUndoButton({
  undo,
  canUndo,
  visible = true,
  className,
  variant = 'outline',
  size = 'sm',
  ariaLabel = 'Undo (Ctrl+Z)',
  title = 'Undo (Ctrl+Z)',
}: EditModeUndoButtonProps) {
  if (!visible || undo == null) return null

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`gap-1.5 text-xs ${className ?? ''}`}
      onClick={undo}
      disabled={!canUndo}
      aria-label={ariaLabel}
      title={title}
    >
      <Undo2 className="h-3.5 w-3.5" />
      Undo
    </Button>
  )
}
