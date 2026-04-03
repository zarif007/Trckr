import 'server-only'

/**
 * Shared NDJSON run tracing: create run, forward events to client + DB, finish or mark failed.
 * Report and analysis orchestrators inject Prisma-specific helpers.
 */
export async function withTracedRun<TEvent>(params: {
 writeNdjsonLine: (line: string) => Promise<void> | void
 encodeLine: (event: TEvent) => string
 createRun: () => Promise<{ id: string }>
 appendEvent: (runId: string, seq: number, event: TEvent) => Promise<void>
 finishRun: (runId: string, status: 'completed' | 'failed') => Promise<void>
 buildErrorEvent: (message: string) => TEvent
 fn: (forward: (event: TEvent) => Promise<void>) => Promise<void>
}): Promise<void> {
 const run = await params.createRun()
 let seq = 0
 const forward = async (event: TEvent) => {
 await params.writeNdjsonLine(params.encodeLine(event))
 await params.appendEvent(run.id, seq, event)
 seq += 1
 }
 try {
 await params.fn(forward)
 await params.finishRun(run.id, 'completed')
 } catch (e) {
 const message = e instanceof Error ? e.message : 'Run failed'
 await forward(params.buildErrorEvent(message))
 await params.finishRun(run.id, 'failed')
 throw e
 }
}
