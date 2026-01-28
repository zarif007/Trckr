export type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'multiselect'
  | 'boolean'
  | 'text'

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
    defaultValue?: any
    required?: boolean
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    options?: { id: string; label: string }[]
  }
}

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  examples: Array<Record<string, any>>
  views: string[]
}
