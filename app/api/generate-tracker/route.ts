import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { trackerSchema } from '@/lib/schemas/tracker'
import { deepseek } from '@ai-sdk/deepseek'
import { streamObject } from 'ai'

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
      type: 'table' | 'kanban' | 'div'
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

    const prompt = conversationContext
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${messages && messages.length > 0 ? 'update or modify' : 'create'
      } the tracker according to the user's latest request.`
      : query

    const enhancedSystemPrompt = `${trackerBuilderPrompt}

${messages && messages.length > 0
        ? 'Note: The user may be requesting changes or refinements to a previous tracker. Pay attention to the conversation history and modify the tracker accordingly while maintaining the structure.'
        : ''
      }`

    const result = streamObject({
      model: deepseek('deepseek-chat'),
      system: enhancedSystemPrompt,
      prompt: prompt,
      schema: trackerSchema,
    })

    return result.toTextStreamResponse()
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
