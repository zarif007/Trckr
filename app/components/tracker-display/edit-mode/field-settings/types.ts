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
  /** Optional tab to open first when dialog appears. */
  defaultTab?:
    | 'general'
    | 'validations'
    | 'calculations'
    | 'dependsOn'
    | 'bindings'
    | 'dynamicOptions'
  /** Optional whitelist of tabs to render. Useful for focused workflows. */
  allowedTabs?: Array<
    | 'general'
    | 'validations'
    | 'calculations'
    | 'dependsOn'
    | 'bindings'
    | 'dynamicOptions'
  >
  schema: TrackerDisplayProps | undefined
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined
}
