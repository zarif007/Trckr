import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
  Tags,
} from 'lucide-react'

export type FieldType = 'string' | 'number' | 'date' | 'options' | 'multiselect' | 'boolean' | 'text'

export interface FieldMetadata {
  [key: string]: {
    name: string
    type: FieldType
    options?: string[]
  }
}

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
      return List
    case 'multiselect':
      return Tags
    default:
      return Type
  }
}
