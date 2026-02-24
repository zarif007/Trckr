import { deepseek } from '@ai-sdk/deepseek'
import { generateObject } from 'ai'
import { exprOutputSchema, normalizeExprNode } from '@/lib/schemas/expr'
import { buildSystemPrompt, buildUserPrompt, type ExprPromptInputs } from './prompts'

export interface GenerateExprResult {
  expr: unknown
}

export async function generateExpr(inputs: ExprPromptInputs): Promise<GenerateExprResult> {
  const system = buildSystemPrompt(inputs.purpose)
  const prompt = buildUserPrompt(inputs)
  const { object } = await generateObject({
    model: deepseek('deepseek-chat'),
    system,
    prompt,
    schema: exprOutputSchema,
    maxOutputTokens: 1024,
  })

  const expr = normalizeExprNode(object.expr)
  return { expr }
}
