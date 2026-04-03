import type { LanguageModelUsage } from 'ai'

import { analystSchema, type AnalystSchema } from '@/lib/schemas/analyst'
import { getDefaultAiProvider, logAiError, logAiStage } from '@/lib/ai'
import type { RequestLogContext } from '@/lib/api'
import { getAnalystSystemPrompt, buildAnalystUserPrompt } from './prompts'
import type { AnalystPromptInputs } from './prompts'
import { getConfiguredMaxOutputTokens } from '@/lib/ai'

export interface GenerateAnalysisOptions {
 logContext?: RequestLogContext
 onLlmUsage?: (usage: LanguageModelUsage) => void
}

function toStreamResponse(object: AnalystSchema): Response {
 const json = JSON.stringify(object)
 const stream = new ReadableStream({
 start(controller) {
 controller.enqueue(json)
 controller.close()
 },
 })
 return new Response(stream.pipeThrough(new TextEncoderStream()), {
 headers: { 'Content-Type': 'text/plain; charset=utf-8' },
 })
}

export async function generateAnalysisResponse(
 inputs: AnalystPromptInputs,
 options: GenerateAnalysisOptions = {},
): Promise<{ response: Response }> {
 const provider = getDefaultAiProvider()
 const systemPrompt = getAnalystSystemPrompt()
 const userPrompt = buildAnalystUserPrompt(inputs)
 const maxTokens = getConfiguredMaxOutputTokens()

 try {
 const result = provider.streamObject({
 system: systemPrompt,
 prompt: userPrompt,
 schema: analystSchema,
 maxOutputTokens: maxTokens,
 onFinish: ({ error: validationError, usage }) => {
 options.onLlmUsage?.(usage)
 if (validationError && options.logContext) {
 logAiError(options.logContext, 'analyst-stream-validation', validationError)
 }
 },
 })
 if (options.logContext) {
 logAiStage(options.logContext, 'analyst-stream-success', `Provider=${provider.id}`)
 }
 return { response: result.toTextStreamResponse() }
 } catch (error) {
 if (options.logContext) {
 logAiError(options.logContext, 'analyst-stream-failure', error)
 }
 }

 // Fallback: single generateObject call
 try {
 const { object, usage } = await provider.generateObject<AnalystSchema>({
 system: systemPrompt,
 prompt: userPrompt,
 schema: analystSchema,
 maxOutputTokens: maxTokens,
 })
 options.onLlmUsage?.(usage)
 if (options.logContext) {
 logAiStage(options.logContext, 'analyst-fallback-success', `Provider=${provider.id}`)
 }
 return { response: toStreamResponse(object) }
 } catch (error) {
 if (options.logContext) {
 logAiError(options.logContext, 'analyst-fallback-failure', error)
 }
 throw error
 }
}
