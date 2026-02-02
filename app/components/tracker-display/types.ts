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
  /** @deprecated Use top-level bindings object instead. Kept for backward compatibility. */
  optionTableId?: string
  /** @deprecated Use top-level bindings object instead. Kept for backward compatibility. */
  optionMapId?: string
  /** @deprecated Use top-level bindings object instead. Kept for backward compatibility. */
  optionsMappingId?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  /** @deprecated Use top-level bindings object instead. Old binding format. */
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

/**
 * Map entry: options for select/multiselect come from grid rows at (tabId, gridId).
 * @deprecated Use bindings instead. Kept for backward compatibility.
 */
export type TrackerOptionMap = {
  id: string
  tabId: string
  gridId: string
  labelFieldId?: string
  valueFieldId?: string
}

// ============================================================================
// BINDINGS SYSTEM - Top-level bindings for select/multiselect fields
// ============================================================================

/** Dot-notation path: "grid_id.field_id" (no tab) */
export type FieldPath = string

/** Single field mapping for auto-population when an option is selected */
export type FieldMapping = {
  /** Path in options grid: "product_options_grid.price" */
  from: FieldPath
  /** Path in main grid: "orders_grid.price" */
  to: FieldPath
}

/** Binding entry for a select/multiselect field */
export type TrackerBindingEntry = {
  /** Grid id containing options (e.g. "product_options_grid") */
  optionsGrid: string
  /** Path to label field: "product_options_grid.label" */
  labelField: FieldPath
  /**
   * Field mappings: from option row field -> to main grid field.
   * Must include one mapping where "to" is this select field path (that "from" is the stored value).
   * Other mappings auto-populate when an option is selected.
   */
  fieldMappings: FieldMapping[]
}

/** Top-level bindings object. Key is "grid_id.field_id" */
export type TrackerBindings = Record<FieldPath, TrackerBindingEntry>

export interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  /** Bindings for select/multiselect fields. Key is grid_id.field_id. Mandatory for all options/multiselect. */
  bindings?: TrackerBindings
}
