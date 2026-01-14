import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { deepseek } from '@ai-sdk/deepseek'
import { generateObject } from 'ai'
import { z } from 'zod'

// Define the schema for the tracker response
const fieldName = () =>
  z
    .string()
    .regex(/^[a-z][A-Za-z0-9]*$/, {
      message: 'Must be camelCase, English, no spaces',
    })
    .describe(
      'CamelCase identifier for code usage (must be unique across all tabs, sections, grids, and fields)'
    )

const trackerSchema = z.object({
  tabs: z
    .array(
      z.object({
        name: z.string().describe('Human-friendly tab title'),
        fieldName: fieldName(),
      })
    )
    .describe('Array of independent tab objects'),
  sections: z
    .array(
      z.object({
        name: z.string().describe('Section display name'),
        fieldName: fieldName(),
        tabId: z.string().describe('fieldName of the tab this section belongs to'),
      })
    )
    .describe('Array of independent section objects linked to tabs via tabId'),
  grids: z
    .array(
      z.object({
        name: z.string().describe('Grid display name'),
        fieldName: fieldName(),
        type: z
          .enum(['table', 'kanban'])
          .describe('Layout type for this grid'),
        sectionId: z
          .string()
          .describe('fieldName of the section this grid belongs to'),
      })
    )
    .describe('Array of independent grid objects linked to sections via sectionId'),
  fields: z
    .array(
      z.object({
        name: z.string().describe('Field display name'),
        fieldName: fieldName(),
        type: z
          .enum([
            'string',
            'number',
            'date',
            'options',
            'boolean',
            'text',
          ])
          .describe('Field data type'),
        gridId: z
          .string()
          .describe('fieldName of the grid this field belongs to'),
        options: z
          .array(z.string())
          .optional()
          .describe('Options when type is "options"'),
      })
    )
    .describe('Array of independent field objects linked to grids via gridId'),
  views: z
    .array(z.string())
    .describe('Array of view names like "Table", "Calendar", etc.'),
  examples: z
    .array(z.record(z.string(), z.any()))
    .describe(
      'Array of 2-3 sample data objects; keys must match every fieldName defined in fields.'
    ),
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  trackerData?: {
    tabs: Array<{
      name: string
      fieldName: string
    }>
    sections: Array<{
      name: string
      fieldName: string
      tabId: string
    }>
    grids: Array<{
      name: string
      fieldName: string
      type: 'table' | 'kanban'
      sectionId: string
    }>
    fields: Array<{
      name: string
      fieldName: string
      type: string
      gridId: string
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
          const tabs = msg.trackerData.tabs || []
          const sections = msg.trackerData.sections || []
          const grids = msg.trackerData.grids || []
          const fields = msg.trackerData.fields || []

          const trackerSummary = `Previous tracker I created:
- Tabs: ${tabs
              .map(
                (t: { name: string; fieldName: string }) =>
                  `${t.name} (${t.fieldName})`
              )
              .join(', ')}
- Sections: ${sections
              .map(
                (s: {
                  name: string
                  fieldName: string
                  tabId: string
                }) => `${s.name} (${s.fieldName}, tab: ${s.tabId})`
              )
              .join(', ')}
- Grids: ${grids
              .map(
                (g: {
                  name: string
                  fieldName: string
                  type: string
                  sectionId: string
                }) =>
                  `${g.name} (${g.fieldName}, ${g.type}, section: ${g.sectionId})`
              )
              .join(', ')}
- Fields: ${fields
              .map(
                (f: {
                  name: string
                  fieldName: string
                  type: string
                  gridId: string
                }) => `${f.name} (${f.fieldName}, ${f.type}, grid: ${f.gridId})`
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
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${messages && messages.length > 0 ? 'update or modify' : 'create'
      } the tracker according to the user's latest request.`
      : query

    // Update system prompt to handle conversations
    const enhancedSystemPrompt = `${trackerBuilderPrompt}

${messages && messages.length > 0
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
