import { z } from 'zod'

/** Shared input shape for validation/calculation expression tools (LLM or API). */
export const exprIntentToolInputSchema = z.object({
 prompt: z
 .string()
 .describe('Natural language description of the expression logic (_intent).'),
 fieldPath: z
 .string()
 .describe('Target field path as gridId.field_id (same as bindings/validations keys).'),
 currentTracker: z
 .unknown()
 .optional()
 .describe('Full tracker JSON for field context (layout, labels, types).'),
})

export type ExprIntentToolInput = z.infer<typeof exprIntentToolInputSchema>

const validationDescription =
 'Generate a boolean expression AST for a field validation rule from natural language. Use when a validation rule has type "expr" and needs an expression that evaluates to true when valid.'

const calculationDescription =
 'Generate an expression AST that computes the target field value from natural language. Use for calculated/read-only fields keyed by gridId.field_id in calculations.'

/** Metadata for agentic flows; server execution lives in app/api/agent/generate-expr/lib/run-intent.ts */
export const generateValidationExpressionTool = {
 name: 'generateValidationExpression' as const,
 purpose: 'validation' as const,
 description: validationDescription,
 inputSchema: exprIntentToolInputSchema,
} as const

export const generateCalculationExpressionTool = {
 name: 'generateCalculationExpression' as const,
 purpose: 'calculation' as const,
 description: calculationDescription,
 inputSchema: exprIntentToolInputSchema,
} as const
