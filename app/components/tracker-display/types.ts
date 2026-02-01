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

export type TrackerGrid = {
  id: string
  name: string
  type: GridType
  sectionId: string
  placeId: number
  config?: TrackerGridConfig
}

/** Field config: isRequired (show "*", validate), isDisabled, isHidden; plus type-specific. */
export type TrackerFieldConfig = {
  isRequired?: boolean
  isDisabled?: boolean
  isHidden?: boolean
  defaultValue?: unknown
  optionsMappingId?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  binding?: { tableName: string; fieldName: string }
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

export type TrackerOptionTable = {
  id: string
  options: Array<TrackerOption>
}

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  optionTables?: TrackerOptionTable[]
}
