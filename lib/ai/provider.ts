import { deepseek } from '@ai-sdk/deepseek'
import { generateObject, streamObject } from 'ai'
import type { LanguageModelUsage } from 'ai'
import type { ZodTypeAny } from 'zod'

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
    const result = await generateObject({
      model: this.model(),
      system: input.system,
      prompt: input.prompt,
      schema: input.schema,
      maxOutputTokens: input.maxOutputTokens,
    })
    return { object: result.object as T, usage: result.usage }
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

