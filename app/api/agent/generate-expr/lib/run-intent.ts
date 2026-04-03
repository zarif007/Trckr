import { parseFieldPath } from '@/lib/expr-intents/field-path'
import {
 exprIntentToolInputSchema,
 generateCalculationExpressionTool,
 generateValidationExpressionTool,
} from '@/lib/expr-intents/tools'
import type { ExprIntentPurpose } from '@/lib/expr-intents/types'

import { generateExpr, type GenerateExprResult } from './generate'
import { deriveAvailableFields } from './prompts'

export type { GenerateExprResult }

/**
 * Single entry point for generating an expression from an intent (shared by the HTTP route and tool executors).
 */
export async function runGenerateExprIntent(params: {
 prompt: string
 fieldPath: string
 purpose: ExprIntentPurpose
 currentTracker?: unknown
}): Promise<GenerateExprResult> {
 const { gridId, fieldId } = parseFieldPath(params.fieldPath)
 const availableFields = deriveAvailableFields(params.currentTracker ?? null, gridId)
 return generateExpr({
 prompt: params.prompt,
 gridId,
 fieldId,
 purpose: params.purpose,
 availableFields,
 })
}

export async function executeGenerateValidationExpression(raw: unknown): Promise<GenerateExprResult> {
 const input = exprIntentToolInputSchema.parse(raw)
 return runGenerateExprIntent({
 prompt: input.prompt,
 fieldPath: input.fieldPath,
 purpose: generateValidationExpressionTool.purpose,
 currentTracker: input.currentTracker,
 })
}

export async function executeGenerateCalculationExpression(raw: unknown): Promise<GenerateExprResult> {
 const input = exprIntentToolInputSchema.parse(raw)
 return runGenerateExprIntent({
 prompt: input.prompt,
 fieldPath: input.fieldPath,
 purpose: generateCalculationExpressionTool.purpose,
 currentTracker: input.currentTracker,
 })
}
