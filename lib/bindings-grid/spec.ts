/**
 * Definition of the Bindings grid columns: field ids, labels, data types, and
 * which dynamic-options function supplies options for each column.
 */

import {
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS_INCLUDING_SHARED,
  DYNAMIC_OPTIONS_ALL_GRIDS,
} from '@/lib/dynamic-options'
import type { TrackerField } from '@/app/components/tracker-display/types'
import { BINDINGS_GRID_FIELD_IDS } from './constants'
import type { BindingsGridFieldId } from './constants'

export const BINDINGS_GRID_FIELD_LABELS: Record<BindingsGridFieldId, string> = {
  binding_select_field: 'Select field',
  binding_options_grid: 'Options grid',
  binding_label_field: 'Label field',
  binding_fields_mapping: 'Fields mapping',
}

/** Dynamic option function id per column. Label and mappings need Shared-tab fields (option grids). */
export const BINDINGS_GRID_DYNAMIC_FUNCTION: Partial<Record<BindingsGridFieldId, string>> = {
  binding_select_field: DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  binding_options_grid: DYNAMIC_OPTIONS_ALL_GRIDS,
  binding_label_field: DYNAMIC_OPTIONS_ALL_FIELD_PATHS_INCLUDING_SHARED,
  binding_fields_mapping: DYNAMIC_OPTIONS_ALL_FIELD_PATHS_INCLUDING_SHARED,
}

/** Data type for the Bindings grid field. */
export function getBindingsGridFieldDataType(fieldId: BindingsGridFieldId): TrackerField['dataType'] {
  return fieldId === 'binding_fields_mapping' ? 'field_mappings' : 'dynamic_select'
}

/** Build a TrackerField for a Bindings grid column. */
export function buildBindingsGridField(fieldId: BindingsGridFieldId): TrackerField {
  const dynamicFunction = BINDINGS_GRID_DYNAMIC_FUNCTION[fieldId]
  return {
    id: fieldId,
    dataType: getBindingsGridFieldDataType(fieldId),
    ui: { label: BINDINGS_GRID_FIELD_LABELS[fieldId], placeholder: '' },
    config: {
      ...(dynamicFunction ? { dynamicOptionsFunction: dynamicFunction } : {}),
    },
  }
}
