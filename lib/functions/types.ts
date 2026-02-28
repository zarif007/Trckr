/**
 * Type Definitions for Expression and Validation System
 * 
 * Core types for the expression AST, validation rules, and calculation rules.
 * These types define the shape of data passed between the UI, storage, and runtime.
 * 
 * @module functions/types
 */

// ============================================================================
// Expression AST Types
// ============================================================================

/** Comparison operators with aliases for various syntax styles */
type ComparisonOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | '='
  | '=='
  | '==='
  | '!='
  | '!=='
  | '>'
  | '>='
  | '<'
  | '<='

/**
 * Expression AST Node
 * 
 * A discriminated union representing all expression types.
 * Each node has an `op` field that determines its shape.
 * 
 * @example
 * ```ts
 * // Constant
 * { op: 'const', value: 42 }
 * 
 * // Field reference (must use gridId.fieldId format)
 * { op: 'field', fieldId: 'invoice_grid.total' }
 * 
 * // Arithmetic
 * { op: 'add', args: [{ op: 'field', fieldId: 'a' }, { op: 'field', fieldId: 'b' }] }
 * { op: 'sub', left: { op: 'const', value: 100 }, right: { op: 'field', fieldId: 'x' } }
 * 
 * // Conditional
 * { op: 'if', cond: {...}, then: {...}, else: {...} }
 * ```
 */
export type ExprNode =
  | { op: 'const'; value: unknown }
  /** fieldId must be "gridId.fieldId" (e.g. main_grid.sku), like bindings. */
  | { op: 'field'; fieldId: string }
  | { op: 'add'; args: ExprNode[] }
  | { op: 'mul'; args: ExprNode[] }
  | { op: 'sub'; left: ExprNode; right: ExprNode }
  | { op: 'div'; left: ExprNode; right: ExprNode }
  | { op: ComparisonOp; left: ExprNode; right: ExprNode }
  | { op: 'and' | 'or'; args: ExprNode[] }
  | { op: 'not'; arg: ExprNode }
  | { op: 'if'; cond: ExprNode; then: ExprNode; else: ExprNode }
  | { op: 'regex'; value: ExprNode; pattern: string; flags?: string }

// ============================================================================
// Validation & Calculation Rules
// ============================================================================

/**
 * Field Validation Rule
 * 
 * Defines constraints for field values. Rules are evaluated in order
 * and the first failure returns its error message.
 * 
 * @example
 * ```ts
 * // Required
 * { type: 'required', message: 'This field is required' }
 * 
 * // Numeric bounds
 * { type: 'min', value: 0 }
 * { type: 'max', value: 100 }
 * 
 * // String length
 * { type: 'minLength', value: 3 }
 * { type: 'maxLength', value: 50 }
 * 
 * // Custom expression
 * { type: 'expr', expr: { op: 'gt', left: {...}, right: {...} }, message: 'Custom error' }
 * ```
 */
export type FieldValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'min' | 'max' | 'minLength' | 'maxLength'; value: number; message?: string }
  | { type: 'expr'; expr: ExprNode; message?: string }

/**
 * Field Calculation Rule
 * 
 * Defines how a field's value is computed from other fields.
 * The expression is evaluated whenever dependencies change.
 */
export interface FieldCalculationRule {
  /** Expression to evaluate for the field value */
  expr: ExprNode
}

// ============================================================================
// Runtime Context
// ============================================================================

/**
 * Evaluation Context
 * 
 * Provides runtime data for expression evaluation.
 * Contains row values and field metadata.
 */
export interface FunctionContext {
  /** Current row values keyed by fieldId (and optionally gridId.fieldId) */
  rowValues: Record<string, unknown>
  /** Field being evaluated */
  fieldId: string
  /** Field configuration (for validation rules) */
  fieldConfig?: Record<string, unknown> | null
  /** Field data type (for type-specific validation) */
  fieldDataType?: string
}
