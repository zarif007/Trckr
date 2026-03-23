import 'server-only'

import { generateExpr } from '@/app/api/generate-expr/lib/generate'
import { deriveAvailableFields } from '@/app/api/generate-expr/lib/prompts'

/**
 * Reuses the same LLM + schema as `/api/generate-expr` with `purpose: 'report'`.
 * Call from the report orchestrator (do not HTTP to your own API).
 */
export async function generateReportExprAst(params: {
  prompt: string
  trackerSchema: unknown
  primaryGridId: string
  fieldId?: string
}) {
  const availableFields = deriveAvailableFields(params.trackerSchema, params.primaryGridId)
  return generateExpr({
    prompt: params.prompt,
    gridId: params.primaryGridId,
    fieldId: params.fieldId ?? 'report.calc',
    purpose: 'report',
    availableFields,
  })
}
