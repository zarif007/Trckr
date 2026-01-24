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
          
          // Create a clean, minimal JSON summary of the current tracker state
          const currentTrackerState = {
            tabs: tabs.map((t: any) => ({ name: t.name, id: t.fieldName })),
            sections: sections.map((s: any) => ({ name: s.name, id: s.fieldName, tab: s.tabId })),
            grids: grids.map((g: any) => ({ name: g.name, id: g.fieldName, type: g.type, section: g.sectionId })),
            shadowGrids: shadowGrids.map((sg: any) => ({ name: sg.name, id: sg.fieldName, type: sg.type, shadows: sg.gridId })),
            fields: fields.map((f: any) => ({ name: f.name, id: f.fieldName, type: f.type, grid: f.gridId, options: f.options }))
          }

          const trackerSummary = `Current Tracker State (JSON):
${JSON.stringify(currentTrackerState, null, 2)}`
          
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
