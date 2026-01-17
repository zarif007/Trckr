import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
} from 'lucide-react'

export type FieldType = 'string' | 'number' | 'date' | 'options' | 'boolean' | 'text'

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
    default:
      return Type
  }
}
