export type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'multiselect'
  | 'dynamic_select'
  | 'dynamic_multiselect'
  | 'boolean'
  | 'text'
  | 'link'
  | 'currency'
  | 'percentage'

/** Tab config: isHidden, etc. */
export type TrackerTabConfig = {
  isHidden?: boolean
  [key: string]: unknown
}

export type TrackerTab = {
  id: string
  name: string
  placeId: number
  config?: TrackerTabConfig
}

/** Section config: isHidden, isCollapsedByDefault, etc. */
export type TrackerSectionConfig = {
  isHidden?: boolean
  isCollapsedByDefault?: boolean
  [key: string]: unknown
}

export type TrackerSection = {
  id: string
  name: string
  tabId: string
  placeId: number
  config?: TrackerSectionConfig
}

export type GridType = 'div' | 'table' | 'kanban' | 'timeline' | 'calendar'

/** Grid config: layout (div), groupBy (kanban), row/layout edit flags, etc. */
export type TrackerGridConfig = {
  layout?: 'vertical' | 'horizontal'
  groupBy?: string
  /** When false, hide Add Entry and disallow adding rows. Default true. */
  isRowAddAble?: boolean
  /** When false, cells and row details are read-only. Default true. */
  isRowEditAble?: boolean
  /** When false, hide Delete button and row selection. Default true. */
  isRowDeleteAble?: boolean
  /** When false, hide column visibility / grid layout settings. Default true. */
  isEditAble?: boolean
  [key: string]: unknown
}

/** View: same grid data, different type/config (e.g. Kanban tab with groupBy). */
export type TrackerGridView = {
  id?: string
  name?: string
  type: GridType
  config?: TrackerGridConfig
}

export type TrackerGrid = {
  id: string
  name: string
  sectionId: string
  placeId: number
  config?: TrackerGridConfig
  /** Required views (Table/Kanban/etc); each has its own type and config. */
  views?: TrackerGridView[]
  /** Legacy: grid-level type (deprecated; use views instead). */
  type?: GridType
}

/** Field config: isRequired (show "*", validate), isDisabled, isHidden; plus type-specific. */
export type TrackerFieldConfig = {
  isRequired?: boolean
  isDisabled?: boolean
  isHidden?: boolean
  defaultValue?: unknown
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  [key: string]: unknown
}

export type TrackerField = {
  id: string
  dataType: TrackerFieldType
  ui: {
    label: string
    placeholder?: string
  }
  config?: TrackerFieldConfig
}

export type TrackerLayoutNode = {
  gridId: string
  fieldId: string
  order: number
  /** Row index for div (form) grid layout; used with col for 2D placement. */
  row?: number
  /** Column index for div (form) grid layout; max 3 per row. */
  col?: number
  renderAs?: 'default' | 'table' | 'kanban' | 'calendar' | 'timeline'
}

export type TrackerOption = {
  label: string
  value: unknown
  id?: string
  [key: string]: unknown
}

import type { StyleOverrides } from '@/lib/schemas/tracker'
export type { StyleOverrides }
import type { FieldValidationRule } from '@/lib/functions/types'
export type { FieldValidationRule }

// Re-export binding types from lib for backward compatibility
export type {
  FieldPath,
  FieldMapping,
  TrackerBindingEntry,
  TrackerBindings,
} from '@/lib/types/tracker-bindings'

export type { DependsOnRule, DependsOnRules, FieldOverride } from '@/lib/depends-on'

import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { DependsOnRules } from '@/lib/depends-on'

/** Grid data map: grid id -> array of row objects. Used in refs to avoid TSX >> parsing. */
export type GridDataRecord = Record<string, Array<Record<string, unknown>>>

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  /** Field validations keyed by "gridId.fieldId" (like bindings). */
  validations?: Record<string, FieldValidationRule[]>
  /** Conditional field actions (hide/require/disable). */
  dependsOn?: DependsOnRules
  /** Bindings for select/multiselect fields. Key is grid_id.field_id. Mandatory for all options/multiselect. */
  bindings?: TrackerBindings
  /** Optional style overrides keyed by grid id or view id. */
  styles?: Record<string, StyleOverrides>
  /** Optional initial grid data (e.g. for demos). Key is grid id, value is array of row objects. */
  initialGridData?: Record<string, Array<Record<string, unknown>>>
  /** Optional ref the display will set to a getter that returns current grid data (values only). */
  getDataRef?: React.MutableRefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
  /** When true, layout is editable (add/remove/reorder columns and fields). */
  editMode?: boolean
  /** Called when schema is changed in edit mode. Pass updated full schema. */
  onSchemaChange?: (schema: TrackerDisplayProps) => void
}
