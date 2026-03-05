import { deepseek } from '@ai-sdk/deepseek'
import { generateObject, streamObject } from 'ai'
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

export interface StructuredAiProvider {
  id: string
  generateObject<T>(input: AiGenerationInput): Promise<T>
  streamObject(input: AiStreamInput): ReturnType<typeof streamObject>
}

class DeepSeekProvider implements StructuredAiProvider {
  readonly id = 'deepseek'

  private model() {
    return deepseek('deepseek-chat')
  }

  async generateObject<T>(input: AiGenerationInput): Promise<T> {
    const { object } = await generateObject({
      model: this.model(),
      system: input.system,
      prompt: input.prompt,
      schema: input.schema,
      maxOutputTokens: input.maxOutputTokens,
    })
    return object as T
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

