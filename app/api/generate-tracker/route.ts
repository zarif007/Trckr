import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { deepseek } from '@ai-sdk/deepseek'
import { generateObject } from 'ai'
import { z } from 'zod'

// Define the schema for the tracker response
const trackerSchema = z.object({
  tabs: z
    .array(
      z.object({
        name: z.string().describe('Tab name for organizing the tracker'),
        type: z
          .enum(['table', 'kanban'])
          .describe(
            'Tab type: "table" for normal sections, "kanban" for kanban boards'
          ),
      })
    )
    .describe('Array of tabs with their names and types'),
  fields: z
    .array(
      z.object({
        name: z.string().describe('Field display name (user-facing)'),
        fieldName: z
          .string()
          .describe(
            'Field name for code usage (camelCase, e.g. "color" for "Color")'
          ),
        type: z
          .enum(['string', 'number', 'date', 'options', 'boolean', 'text'])
          .describe('Field type'),
        tab: z.string().describe('Which tab name this field belongs to'),
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
  examples: z
    .array(z.record(z.string(), z.any()))
    .describe(
      'Array of 2-3 sample data objects to show what the tracker will look like with data. Each object should have keys matching fieldName values.'
    ),
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  trackerData?: {
    tabs: Array<{
      name: string
      type: 'table' | 'kanban'
    }>
    fields: Array<{
      name: string
      fieldName: string
      type: string
      tab: string
      options?: string[]
    }>
    views: string[]
    examples: Array<Record<string, any>>
  }
}

export async function POST(request: Request) {
  try {
    const { query, messages } = await request.json()

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Query is required' }, { status: 400 })
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Build conversation context for the prompt
    let conversationContext = ''

    if (messages && Array.isArray(messages) && messages.length > 0) {
      const contextParts: string[] = []

      for (const msg of messages) {
        if (msg.role === 'user') {
          contextParts.push(`User: ${msg.content}`)
        } else if (msg.role === 'assistant' && msg.trackerData) {
          // Convert tracker data to a readable summary for context
          const trackerSummary = `Previous tracker I created:
- Tabs: ${msg.trackerData.tabs
            .map((t: { name: string; type: string }) => `${t.name} (${t.type})`)
            .join(', ')}
- Fields: ${msg.trackerData.fields
            .map(
              (f: {
                name: string
                fieldName: string
                type: string
                tab: string
              }) => `${f.name} (${f.fieldName}, ${f.type}, tab: ${f.tab})`
            )
            .join(', ')}
- Views: ${msg.trackerData.views.join(', ')}`
          contextParts.push(`Assistant: ${trackerSummary}`)
        } else if (msg.role === 'assistant') {
          contextParts.push(`Assistant: ${msg.content}`)
        }
      }

      conversationContext = contextParts.join('\n\n') + '\n\n'
    }

    // Build the final prompt with conversation history
    const prompt = conversationContext
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${
          messages && messages.length > 0 ? 'update or modify' : 'create'
        } the tracker according to the user's latest request.`
      : query

    // Update system prompt to handle conversations
    const enhancedSystemPrompt = `${trackerBuilderPrompt}

${
  messages && messages.length > 0
    ? 'Note: The user may be requesting changes or refinements to a previous tracker. Pay attention to the conversation history and modify the tracker accordingly while maintaining the structure.'
    : ''
}`

    // Initialize DeepSeek model - API key is auto-detected from DEEPSEEK_API_KEY env var
    const result = await generateObject({
      model: deepseek('deepseek-chat'),
      system: enhancedSystemPrompt,
      prompt: prompt,
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
