/**
 * Public input/output types for the Depends On option grids feature.
 */

import type {
  TrackerGrid,
  TrackerField,
  TrackerSection,
  TrackerLayoutNode,
} from '@/app/components/tracker-display/types'
import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { DependsOnRules } from '@/lib/depends-on'

export interface DependsOnOptionGridsInput {
  grids: TrackerGrid[]
  fields: TrackerField[]
  sections: TrackerSection[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  dependsOn: DependsOnRules
}

export interface DependsOnOptionGridsResult {
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  /** Seed gridData for option grids and rules grid. Merge into main gridData. */
  seedGridData: Record<string, Array<Record<string, unknown>>>
}
