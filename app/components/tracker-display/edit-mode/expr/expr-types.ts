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

export type AccumulateAction = 'add' | 'sub' | 'mul'

/** Accumulator node variant: full reduce (accumulate), sum-only, or count. */
export type AccumulatorKind = 'accumulate' | 'sum' | 'count'

export interface AvailableField {
  fieldId: string
  label: string
  dataType?: string
}

export type ExprFlowNodeType = 'field' | 'const' | 'op' | 'result' | 'accumulator'
