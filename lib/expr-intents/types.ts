/**
 * Expression intents: placeholders in tracker.validations / tracker.calculations
 * that are resolved to ExprNode via the same AST generator (generate-expr).
 */

export type ExprIntentPurpose = 'validation' | 'calculation' | 'field-rule'

export interface ExprIntent {
 fieldPath: string
 purpose: ExprIntentPurpose
 /** Natural-language description (_intent) passed to the expression generator */
 description: string
 /** For validations: index into the rules array for this field path */
 ruleIndex?: number
}

export interface ExprIntentResolution {
 intent: ExprIntent
 expr: unknown
}
