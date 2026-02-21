export type ExprFlowOperator =
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'

export interface AvailableField {
  fieldId: string
  label: string
  dataType?: string
}

export type ExprFlowNodeType = 'field' | 'const' | 'op' | 'result'
