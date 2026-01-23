import managerPrompt from '@/constants/systemPrompts/manager'
import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { multiAgentSchema } from '@/lib/schemas/multi-agent'
import { deepseek } from '@ai-sdk/deepseek'
import { streamObject } from 'ai'

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
          const { tabs = [], sections = [], grids = [], shadowGrids = [], fields = [] } = msg.trackerData
          const trackerSummary = `Previous tracker I created:
- Tabs: ${tabs.map((t: any) => `${t.name} (${t.fieldName})`).join(', ')}
- Sections: ${sections.map((s: any) => `${s.name} (${s.fieldName}, tab: ${s.tabId})`).join(', ')}
- Grids: ${grids.map((g: any) => `${g.name} (${g.fieldName}, ${g.type}, section: ${g.sectionId})`).join(', ')}
- Shadow Grids: ${shadowGrids.map((sg: any) => `${sg.name} (${sg.fieldName}, ${sg.type}, shadows: ${sg.gridId}, section: ${sg.sectionId})`).join(', ')}
- Fields: ${fields.map((f: any) => `${f.name} (${f.fieldName}, ${f.type}, grid: ${f.gridId})`).join(', ')}`
          contextParts.push(`Assistant: ${trackerSummary}`)
        } else if (msg.role === 'assistant') {
          contextParts.push(`Assistant: ${msg.content}`)
        }
      }

      conversationContext = contextParts.join('\n\n') + '\n\n'
    }

    const fullPrompt = conversationContext
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${messages && messages.length > 0 ? 'update or modify' : 'create'} the tracker according to the user's latest request.`
      : query

    // We use a single streamObject call with a combined prompt to ensure the model 
    // generates the manager part first, then the builder part. 
    // This allows for a continuous stream that useObject can easily consume.
    const combinedSystemPrompt = `
      ${managerPrompt}
      
      ---
      
      ONCE YOU HAVE COMPLETED THE PRD, act as the "Builder Agent" and implement the technical schema.
      
      ${trackerBuilderPrompt}
      
      CRITICAL: You are a unified system. First fill the "manager" object thoroughly. 
      Only then proceed to fill the "tracker" object based on your PRD.
    `

    const result = streamObject({
      model: deepseek('deepseek-chat'),
      system: combinedSystemPrompt,
      prompt: fullPrompt,
      schema: multiAgentSchema,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Error generating tracker:', error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate tracker',
      },
      { status: 500 }
    )
  }
}
