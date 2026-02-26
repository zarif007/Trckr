import type { TrackerContextForOptions } from '@/lib/binding'
import type { FieldValidationRule } from '@/lib/functions/types'
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from '../../types'
import type { FieldCalculationRule } from '@/lib/functions/types'

export type DropPlacement = 'left' | 'right' | 'above' | 'below'
export type DropIndicator = { overId: string; placement: DropPlacement } | null

/** Rect-like shape used by getDropPlacementByPointer (compatible with DOM and @dnd-kit rects). */
export type RectLike = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface TrackerDivGridProps {
  tabId: string
  grid: TrackerGrid
  layoutNodes: TrackerLayoutNode[]
  allLayoutNodes?: TrackerLayoutNode[]
  fields: TrackerField[]
  bindings?: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  calculations?: Record<string, FieldCalculationRule>
  styleOverrides?: StyleOverrides
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
  gridDataRef?: React.RefObject<Record<string, Array<Record<string, unknown>>>> | null
  gridDataForThisGrid?: Array<Record<string, unknown>>
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void
  onCrossGridUpdate?: (gridId: string, rowIndex: number, fieldId: string, value: unknown) => void
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void
  trackerContext?: TrackerContextForOptions
}

/** Resolved option shape from resolveFieldOptionsV2 */
export type ResolvedOption = { value?: unknown; id?: string; label: string }

export interface DivGridFieldCellProps {
  field: TrackerField
  value: unknown
  valueString: string
  options: ResolvedOption[] | undefined
  showError: boolean
  validationError: string | null
  isDisabled: boolean
  inputTextClass: string
  wrapperClassName: string
  onUpdate: (fieldId: string, value: unknown) => void
  onUpdateWithTouched: (fieldId: string, value: unknown) => void
  onSelectChange: (fieldId: string, value: unknown) => void
  openAddOption: (fieldId: string, currentValue?: unknown) => void
  datePickerOpen: boolean
  onDatePickerOpenChange: (open: boolean) => void
}
