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

/** Logic node ops: conditional, boolean combinators */
export type LogicOp = 'if' | 'and' | 'or' | 'not'

/** Math function node ops */
export type MathOp = 'abs' | 'round' | 'floor' | 'ceil' | 'mod' | 'pow' | 'min' | 'max' | 'clamp'

/** String function node ops */
export type StringOp = 'concat' | 'length' | 'trim' | 'toUpper' | 'toLower' | 'slice' | 'includes' | 'regex'

export interface AvailableField {
  fieldId: string
  label: string
  dataType?: string
}

export type ExprFlowNodeType =
  | 'field'
  | 'const'
  | 'op'
  | 'result'
  | 'accumulator'
  | 'logic'
  | 'math'
  | 'string'
