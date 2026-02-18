export type ExprNode =
  | { op: 'const'; value: unknown }
  | { op: 'field'; fieldId: string }
  | { op: 'add'; args: ExprNode[] }
  | { op: 'mul'; args: ExprNode[] }
  | { op: 'sub'; left: ExprNode; right: ExprNode }
  | { op: 'div'; left: ExprNode; right: ExprNode }
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; left: ExprNode; right: ExprNode }
  | { op: 'and' | 'or'; args: ExprNode[] }
  | { op: 'not'; arg: ExprNode }
  | { op: 'if'; cond: ExprNode; then: ExprNode; else: ExprNode }
  | { op: 'regex'; value: ExprNode; pattern: string; flags?: string }

export type FieldValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'min' | 'max' | 'minLength' | 'maxLength'; value: number; message?: string }
  | { type: 'expr'; expr: ExprNode; message?: string }

export interface FunctionContext {
  rowValues: Record<string, unknown>
  fieldId: string
  fieldConfig?: Record<string, unknown> | null
  fieldDataType?: string
}
