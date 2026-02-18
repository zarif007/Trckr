import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
  Tags,
  Link,
  DollarSign,
  Percent,
} from 'lucide-react'
import type { FieldValidationRule } from '@/lib/functions/types'

export type FieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'multiselect'
  | 'dynamic_select'
  | 'dynamic_multiselect'
  | 'boolean'
  | 'text'
  | 'link'
  | 'currency'
  | 'percentage'

export interface FieldConfig {
  isRequired?: boolean
  isDisabled?: boolean
  isHidden?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
}

/** Sanitize value to fit config (clamp numbers, truncate strings). Returns value unchanged if no config. */
export function sanitizeValue(
  value: unknown,
  type: FieldType,
  config?: FieldConfig | null
): unknown {
  if (!config) return value
  switch (type) {
    case 'string':
    case 'text': {
      const s = typeof value === 'string' ? value : String(value ?? '')
      if (typeof config.maxLength === 'number' && s.length > config.maxLength)
        return s.slice(0, config.maxLength)
      return s
    }
    case 'number':
    case 'currency':
    case 'percentage': {
      if (value === '' || value === undefined || value === null) return value
      const n = typeof value === 'number' ? value : parseFloat(String(value))
      if (Number.isNaN(n)) return value
      let out = n
      if (typeof config.min === 'number' && out < config.min) out = config.min
      if (typeof config.max === 'number' && out > config.max) out = config.max
      return out
    }
    default:
      return value
  }
}

/** Field definition for the "Add option" form (one per column in the options grid). */
export interface OptionsGridFieldDef {
  id: string
  label: string
  type: FieldType
  config?: FieldConfig
  validations?: FieldValidationRule[]
}

export interface FieldMetadata {
  [key: string]: {
    name: string
    type: FieldType
    options?: (string | { id: string; label: string })[]
    config?: FieldConfig
    validations?: FieldValidationRule[]
    /** Fields to show in the Add Option form (columns of the options grid). When set with onAddOption, dialog collects all values. */
    optionsGridFields?: OptionsGridFieldDef[]
    /** When set, select/multiselect shows "Add option". Pass full row (all option grid field values); returns the new option value for the select. */
    onAddOption?: (row: Record<string, unknown>) => string
    /** When adding an option, compute binding updates from the new row (for auto-populate in Add Entry dialog). */
    getBindingUpdatesFromRow?: (row: Record<string, unknown>) => Record<string, unknown>
  }
}

export { getValidationError } from '@/lib/field-validation'

export const getFieldIcon = (type: FieldType) => {
  switch (type) {
    case 'string':
      return Type
    case 'number':
      return Hash
    case 'date':
      return Calendar
    case 'text':
      return AlignLeft
    case 'boolean':
      return CheckSquare
    case 'options':
    case 'dynamic_select':
      return List
    case 'multiselect':
    case 'dynamic_multiselect':
      return Tags
    case 'link':
      return Link
    case 'currency':
      return DollarSign
    case 'percentage':
      return Percent
    default:
      return Type
  }
}
