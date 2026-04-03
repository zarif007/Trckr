import type { TrackerFieldType } from '@/lib/tracker-field-types'
export type { TrackerFieldType } from '@/lib/tracker-field-types'
import type { FieldRulesMap } from '@/lib/field-rules'

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
 /** When false, hide Delete button and row selection. Default true. (Prefer isRowDeletable.) */
 isRowDeleteAble?: boolean
 /** Alias for isRowDeleteAble. When false, hide Delete. Default true. */
 isRowDeletable?: boolean
 /** When false, hide column visibility / grid layout settings. Default true. */
 isEditAble?: boolean
 /** Table: default page size. Default 10. */
 pageSize?: number
 /** Table: optional page size options for selector. */
 pageSizeOptions?: number[]
 /** Table: initial sort { id: columnId, desc?: boolean }. */
 defaultSort?: { id: string; desc?: boolean }
 /** Optional quick-create shortcuts for adding rows (“Entry Ways”), configured per grid. */
 entryWays?: import('./entry-way/entry-way-types').EntryWayConfig[]
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
 /** Optional visual prefix shown before the value (e.g. "$"). */
 prefix?: string
 defaultValue?: unknown
 /** Dynamic function id used by dynamic_select/dynamic_multiselect fields. */
 dynamicOptionsFunction?: string
 /** Optional runtime args passed to dynamic option function. */
 dynamicOptionsArgs?: Record<string, unknown>
 /** Optional field-level override for dynamic option cache TTL (seconds). */
 dynamicOptionsCacheTtlSeconds?: number
 min?: number
 max?: number
 minLength?: number
 maxLength?: number
 numberDecimalPlaces?: number
 numberStep?: number
 dateFormat?: 'iso' | 'us' | 'eu' | 'long'
 ratingMax?: number
 ratingAllowHalf?: boolean
 personAllowMultiple?: boolean
 filesMaxCount?: number
 filesMaxSizeMb?: number
 statusOptions?: string[]
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

export type TrackerFormAction = {
 id: string
 label: string
 statusTag: string
 isEditable: boolean
 /** When true, clicking saves data but does not advance form status to this action's statusTag. */
 persistOnly?: boolean
 /**
 * When true on a transition row (not the first row), reaching this statusTag locks further apply-actions.
 * At most one row should be marked last; normalize keeps the last such row in array order.
 */
 isLast?: boolean
}

export type TrackerLayoutNode = {
 gridId: string
 fieldId: string
 order: number
 /** Row index for div (form) grid layout; used with col for 2D placement. */
 row?: number
 /** Column index for div (form) grid layout; max 12 per row (0-11). */
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
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
export type { FieldCalculationRule, FieldValidationRule }
import type { DynamicOptionsDefinitions } from '@/lib/dynamic-options'

// Re-export binding types from lib for backward compatibility
export type {
 FieldPath,
 FieldMapping,
 TrackerBindingEntry,
 TrackerBindings,
} from '@/lib/types/tracker-bindings'

export type { FieldRule, FieldRulesMap, FieldRuleOverride } from '@/lib/field-rules'

import type { TrackerBindings } from '@/lib/types/tracker-bindings'
import type { GridDataSnapshot } from '@/lib/tracker-data'

/** Grid data map: grid id -> array of row objects. Used in refs to avoid TSX >> parsing. */
export type GridDataRecord = Record<string, Array<Record<string, unknown>>>

/** Reported to app chrome when bindings use `optionsSourceSchemaId` (linked tracker options). */
export type ForeignBindingNavUiState = {
 loading: boolean
 saving: boolean
 error: { sourceSchemaId: string; message: string } | null
 dismissError: () => void
}

export interface TrackerDisplayProps {
 /** Optional display name for the tracker (shown in nav, share dialog, etc.). */
 name?: string
 /** Master data scope (tracker/module/project). */
 masterDataScope?: 'tracker' | 'module' | 'project'
 tabs: TrackerTab[]
 sections: TrackerSection[]
 grids: TrackerGrid[]
 fields: TrackerField[]
 /** Optional form actions for status buttons in data mode. */
 formActions?: TrackerFormAction[]
 layoutNodes?: TrackerLayoutNode[]
 /** Field validations keyed by "gridId.fieldId" (like bindings). */
 validations?: Record<string, FieldValidationRule[]>
 /** Field calculations keyed by "gridId.fieldId" (target path). */
 calculations?: Record<string, FieldCalculationRule>
 /** AST-based field behavior rules. Keyed by target field path (gridId.fieldId). */
 fieldRulesV2?: FieldRulesMap
 /** Bindings for select/multiselect fields. Key is grid_id.field_id. Mandatory for all options/multiselect. */
 bindings?: TrackerBindings
 /** Optional style overrides keyed by grid id or view id. */
 styles?: Record<string, StyleOverrides>
 /** Optional initial grid data (e.g. for demos). Key is grid id, value is array of row objects. */
 initialGridData?: Record<string, Array<Record<string, unknown>>>
 /** Optional tracker-local dynamic option function/connectors definitions. */
 dynamicOptions?: DynamicOptionsDefinitions
 /** Optional ref the display will set to a getter that returns current grid data (values only). */
 getDataRef?: React.MutableRefObject<(() => Record<string, Array<Record<string, unknown>>>) | null>
 /** Emits when grid data changes due to user edits. */
 onGridDataChange?: (data: GridDataSnapshot) => void
 /** When true, data inputs are read-only in view mode. */
 readOnly?: boolean
 /** When true, layout is editable (add/remove/reorder columns and fields). */
 editMode?: boolean
 /** Called when schema is changed in edit mode. Pass updated full schema. */
 onSchemaChange?: (schema: TrackerDisplayProps) => void
 /** Undo last edit-mode change. Provided when using useUndoableSchemaChange. */
 undo?: () => void
 /** Whether undo is available. */
 canUndo?: boolean
 /** When set, server-side dynamic option resolution attributes LLM usage to this tracker. */
 trackerSchemaId?: string | null
 /** Project id for inter-tracker bindings picker (same-project trackers). */
 projectId?: string | null
 /** Push linked-tracker load/save UI state to the host (e.g. TrackerNavBar via TrackerNavContext). */
 onForeignBindingNavUiChange?: (ui: ForeignBindingNavUiState | null) => void
}
