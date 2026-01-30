export type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'multiselect'
  | 'boolean'
  | 'text'

export type TrackerOption = { id: string; label: string }

export interface TrackerTab {
  name: string
  fieldName: string
  placeId: number
}

export interface TrackerSection {
  name: string
  fieldName: string
  tabId: string
  placeId: number
}

export type GridType = 'div' | 'table' | 'kanban'

export type DivGridConfig = {
  layout?: 'vertical' | 'horizontal'
}

export type TableGridConfig = {
  sortable?: boolean
  pagination?: boolean
  rowSelection?: boolean
}

export type KanbanGridConfig = {
  groupBy: string
  orderBy?: string
}

export type GridConfig = DivGridConfig | TableGridConfig | KanbanGridConfig

export interface TrackerGrid {
  id: string
  key: string
  name: string
  type: GridType
  sectionId: string
  placeId: number
  isShadow?: boolean
  gridId?: string
  config?: GridConfig
}

export interface TrackerField {
  id: string
  key: string
  dataType: TrackerFieldType
  gridId: string
  placeId: number
  ui: {
    label: string
    placeholder?: string
    order?: number
  }
  config?: {
    defaultValue?: unknown
    required?: boolean
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    /**
     * Deprecated: inline options.
     */
    options?: TrackerOption[]
    /**
     * For options/multiselect fields: the mapping id to resolve options.
     */
    optionsMappingId?: string
  }
}

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  /**
   * Optional per-grid datasets.
   */
  gridData?: Record<string, Array<Record<string, unknown>>>
}
