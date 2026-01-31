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

export type TrackerTab = {
  id: string
  name: string
  placeId: number
}

export type TrackerSection = {
  id: string
  name: string
  tabId: string
  placeId: number
}

export type GridType = 'div' | 'table' | 'kanban' | 'timeline' | 'calendar'

export type TrackerGrid = {
  id: string
  name: string
  type: GridType
  sectionId: string
  placeId: number
  config?: any // Using any for flexibility as per schema union
}

export type TrackerField = {
  id: string
  dataType: TrackerFieldType
  ui: {
    label: string
    placeholder?: string
  }
  config?: any
}

export type TrackerLayoutNode = {
    gridId: string
    refType: 'field' | 'collection'
    refId: string
    order: number
    renderAs?: 'default' | 'table' | 'kanban' | 'calendar' | 'timeline'
}

export type TrackerOption = {
    label: string
    value: any
    id?: string
    [key: string]: any
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
  gridData?: any
}
