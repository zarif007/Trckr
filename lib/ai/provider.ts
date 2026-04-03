import { deepseek } from '@ai-sdk/deepseek'
import { generateObject, streamObject } from 'ai'
import type { LanguageModelUsage } from 'ai'
import type { ZodTypeAny } from 'zod'

import { repairStructuredJsonText } from '@/lib/ai/structured-json-repair'

export interface AiGenerationInput {
 system: string
 prompt: string
 schema: ZodTypeAny
 maxOutputTokens?: number
}

export interface AiStreamInput extends AiGenerationInput {
 onFinish?: Parameters<typeof streamObject>[0]['onFinish']
}

export interface AiObjectResult<T> {
 object: T
 usage: LanguageModelUsage
}

export interface StructuredAiProvider {
 id: string
 generateObject<T>(input: AiGenerationInput): Promise<AiObjectResult<T>>
 streamObject(input: AiStreamInput): ReturnType<typeof streamObject>
}

class DeepSeekProvider implements StructuredAiProvider {
 readonly id = 'deepseek'

 private model() {
 return deepseek('deepseek-chat')
 }

 async generateObject<T>(input: AiGenerationInput): Promise<AiObjectResult<T>> {
 const run = (prompt: string) =>
 generateObject({
 model: this.model(),
 system: input.system,
 prompt,
 schema: input.schema,
 maxOutputTokens: input.maxOutputTokens,
 experimental_repairText: repairStructuredJsonText,
 })

 try {
 const result = await run(input.prompt)
 return { object: result.object as T, usage: result.usage }
 } catch {
 const retryHint = `

Your previous output failed JSON/schema validation. Reply with exactly one JSON value matching the schema.
Rules: use only allowed enum strings; include every required key; use [] for empty arrays and "" for empty strings; numbers must be JSON numbers not strings; do not wrap in markdown.`
 const result = await run(`${input.prompt}${retryHint}`)
 return { object: result.object as T, usage: result.usage }
 }
 }

 streamObject(input: AiStreamInput) {
 return streamObject({
 model: this.model(),
 system: input.system,
 prompt: input.prompt,
 schema: input.schema,
 maxOutputTokens: input.maxOutputTokens,
 onFinish: input.onFinish,
 })
 }
}

const deepSeekProvider = new DeepSeekProvider()

export function getDefaultAiProvider(): StructuredAiProvider {
 return deepSeekProvider
}

