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
/**
 * Accumulator (reduce) over a table column.
 * sourceFieldId must be "gridId.fieldId". startIndex/endIndex are clamped; increment must be > 0.
 * action 'sub' semantics: initialValue - v0 - v1 - ... (default initial 0).
 */
export type AccumulateAction = 'add' | 'sub' | 'mul'

export type ExprNode =
  | { op: 'const'; value: unknown }
  /** fieldId must be "gridId.fieldId" (e.g. main_grid.sku), like bindings. */
  | { op: 'field'; fieldId: string }
  | {
      op: 'accumulate'
      /** Grid and field path (e.g. Amounts_grid.amount) for the column to reduce. */
      sourceFieldId: string
      /** Start index (inclusive). Default 0. Clamped to [0, length-1]. */
      startIndex?: number
      /** End index (inclusive). Default length-1. Clamped to [0, length-1]. */
      endIndex?: number
      /** Step. Default 1. Treated as 1 if <= 0. */
      increment?: number
      /** Reduction operation. */
      action: AccumulateAction
      /** Initial value for reduction. add default 0, mul default 1, sub default 0. */
      initialValue?: number
    }
  | {
      op: 'sum'
      /** Grid and field path for the column to sum (e.g. items_grid.amount). */
      sourceFieldId: string
      startIndex?: number
      endIndex?: number
      increment?: number
      initialValue?: number
    }
  | { op: 'count'; /** Grid and field path to count rows (e.g. items_grid.id). */ sourceFieldId: string }
  | { op: 'add'; args: ExprNode[] }
  | { op: 'mul'; args: ExprNode[] }
  | { op: 'sub'; left: ExprNode; right: ExprNode }
  | { op: 'div'; left: ExprNode; right: ExprNode }
  | { op: ComparisonOp; left: ExprNode; right: ExprNode }
  | { op: 'and' | 'or'; args: ExprNode[] }
  | { op: 'not'; arg: ExprNode }
  | { op: 'if'; cond: ExprNode; then: ExprNode; else: ExprNode }
  | { op: 'regex'; value: ExprNode; pattern: string; flags?: string }
  // Math functions
  | { op: 'abs' | 'round' | 'floor' | 'ceil'; arg: ExprNode }
  | { op: 'mod' | 'pow'; left: ExprNode; right: ExprNode }
  | { op: 'min' | 'max'; args: ExprNode[] }
  | { op: 'clamp'; value: ExprNode; min: ExprNode; max: ExprNode }
  // String functions
  | { op: 'length' | 'trim' | 'toUpper' | 'toLower'; arg: ExprNode }
  | { op: 'includes'; left: ExprNode; right: ExprNode }
  | { op: 'concat'; args: ExprNode[] }
  | { op: 'slice'; value: ExprNode; start: ExprNode; end: ExprNode }

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
  | { type: 'required'; message?: string; enabled?: boolean }
  | { type: 'min' | 'max' | 'minLength' | 'maxLength'; value: number; message?: string; enabled?: boolean }
  | { type: 'expr'; expr: ExprNode; message?: string; enabled?: boolean }

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
 * Contains row values, field metadata, and optional column resolution for accumulate.
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
  /**
   * Optional. When set, used by `accumulate` to get all values for a table column.
   * Path format: "gridId.fieldId". Returns a new array; not mutated.
   * If missing or parsing fails, accumulate returns initialValue.
   */
  getColumnValues?: (path: string) => unknown[]
}
