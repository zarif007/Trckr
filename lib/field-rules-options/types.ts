/**
 * Public input/output types for the Field Rules option grids feature.
 */

import type {
  TrackerGrid,
  TrackerField,
  TrackerSection,
  TrackerLayoutNode,
} from '@/app/components/tracker-display/types'
import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { FieldRules } from '@/lib/field-rules'

export interface FieldRulesOptionGridsInput {
  grids: TrackerGrid[]
  fields: TrackerField[]
  sections: TrackerSection[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  fieldRules: FieldRules
}

export interface FieldRulesOptionGridsResult {
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  /** Seed gridData for option grids and rules grid. Merge into main gridData. */
  seedGridData: Record<string, Array<Record<string, unknown>>>
}
