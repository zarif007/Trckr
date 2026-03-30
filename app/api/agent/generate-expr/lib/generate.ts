import type { LanguageModelUsage } from 'ai'

import { getDefaultAiProvider } from '@/lib/ai'
import type { ExprNode } from '@/lib/functions/types'
import { exprOutputSchema, normalizeExprNode } from '@/lib/schemas/expr'
import { buildSystemPrompt, buildUserPrompt, type ExprPromptInputs } from './prompts'

export interface GenerateExprResult {
  expr: unknown
  usage: LanguageModelUsage
}

export async function generateExpr(inputs: ExprPromptInputs): Promise<GenerateExprResult> {
  const provider = getDefaultAiProvider()
  const system = buildSystemPrompt(inputs.purpose, inputs.gridId)
  const prompt = buildUserPrompt(inputs)
  const { object, usage } = await provider.generateObject<{ expr: unknown }>({
    system,
    prompt,
    schema: exprOutputSchema,
    maxOutputTokens: 1024,
  })

  const expr = normalizeExprNode(object.expr as ExprNode)
  return { expr, usage }
}
