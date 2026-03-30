/**
 * Client-side NDJSON stream reader for the multi-agent event protocol.
 * Reads a ReadableStream<Uint8Array>, splits by newlines, and yields decoded AgentStreamEvents.
 */

import { decodeEvent, type AgentStreamEvent } from './events'

/**
 * Async generator that reads an NDJSON response body and yields parsed AgentStreamEvents.
 * Lines that fail to parse are silently skipped.
 */
export async function* readAgentStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      // The last element may be a partial line — keep it in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const event = decodeEvent(line)
        if (event) yield event
      }
    }

    // Flush any remaining buffer content after the stream ends
    if (buffer.trim()) {
      const event = decodeEvent(buffer)
      if (event) yield event
    }
  } finally {
    reader.releaseLock()
  }
}
