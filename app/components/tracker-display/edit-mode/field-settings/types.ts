/**
 * Types for the field settings dialog and its tabs.
 */

import type { TrackerDisplayProps } from '../../types'

export interface FieldSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldId: string | null
  /** When set, validations/calculations are keyed by gridId.fieldId (like bindings). */
  gridId?: string | null
  schema: TrackerDisplayProps | undefined
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined
}
