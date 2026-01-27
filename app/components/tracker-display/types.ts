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
}

export interface TrackerSection {
  name: string
  fieldName: string
  tabId: string
}

export interface TrackerGrid {
  name: string
  fieldName: string
  type: 'table' | 'kanban' | 'div'
  sectionId: string
}

export interface TrackerField {
  id: string
  key: string
  dataType: TrackerFieldType
  gridId: string
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

export interface TrackerShadowGrid {
  name: string
  fieldName: string
  type: 'table' | 'kanban'
  gridId: string
  sectionId: string
}

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  shadowGrids?: TrackerShadowGrid[]
  fields: TrackerField[]
  examples: Array<Record<string, any>>
  views: string[]
}
