import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { deepseek } from '@ai-sdk/deepseek'
import { generateObject } from 'ai'
import { z } from 'zod'

// Define the schema for the tracker response
const trackerSchema = z.object({
  tabs: z
    .array(z.string())
    .describe('Array of tab names for organizing the tracker'),
  fields: z
    .array(
      z.object({
        name: z.string().describe('Field name'),
        type: z
          .enum(['string', 'number', 'date', 'options', 'boolean', 'text'])
          .describe('Field type'),
        tab: z.string().describe('Which tab this field belongs to'),
        options: z
          .array(z.string())
          .optional()
          .describe('Options if field type is "options"'),
      })
    )
    .describe('Array of fields with their properties and tab assignment'),
  views: z
    .array(z.string())
    .describe('Array of view names like "Today board", "Weekly summary", etc.'),
})

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Query is required' }, { status: 400 })
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = trackerBuilderPrompt

    // Initialize DeepSeek model - API key is auto-detected from DEEPSEEK_API_KEY env var
    const result = await generateObject({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: query,
      schema: trackerSchema,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error('Error generating tracker:', error)
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate tracker',
      },
      { status: 500 }
    )
  }
}
