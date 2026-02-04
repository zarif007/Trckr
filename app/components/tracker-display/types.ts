export type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'multiselect'
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

/** Grid config: layout (div), groupBy (kanban), etc. */
export type TrackerGridConfig = {
  layout?: 'vertical' | 'horizontal'
  groupBy?: string
  [key: string]: unknown
}

/** Shadow view: same grid data, different type/config (e.g. Kanban tab with groupBy). */
export type TrackerGridView = {
  id: string
  name: string
  type: GridType
  config?: TrackerGridConfig
}

export type TrackerGrid = {
  id: string
  name: string
  type: GridType
  sectionId: string
  placeId: number
  config?: TrackerGridConfig
  /** Optional shadow views (e.g. Table | Kanban tabs); each has its own type and config. */
  views?: TrackerGridView[]
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
  renderAs?: 'default' | 'table' | 'kanban' | 'calendar' | 'timeline'
}

export type TrackerOption = {
  label: string
  value: unknown
  id?: string
  [key: string]: unknown
}

// Re-export binding types from lib for backward compatibility
export type {
  FieldPath,
  FieldMapping,
  TrackerBindingEntry,
  TrackerBindings,
} from '@/lib/types/tracker-bindings'

import type { TrackerBindings } from '@/lib/types/tracker-bindings'

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  /** Bindings for select/multiselect fields. Key is grid_id.field_id. Mandatory for all options/multiselect. */
  bindings?: TrackerBindings
  /** Optional initial grid data (e.g. for demos). Key is grid id, value is array of row objects. */
  initialGridData?: Record<string, Array<Record<string, unknown>>>
  /** Optional ref the display will set to a getter that returns current grid data (values only). */
  getDataRef?: React.MutableRefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
}
