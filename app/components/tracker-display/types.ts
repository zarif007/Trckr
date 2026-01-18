export type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
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
  name: string
  fieldName: string
  type: TrackerFieldType
  gridId: string
  options?: string[]
}

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  examples: Array<Record<string, any>>
  views: string[]
}
