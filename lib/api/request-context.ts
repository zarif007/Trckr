import { randomUUID } from 'node:crypto'

const REQUEST_ID_HEADER = 'x-request-id'

export function getRequestId(request: Request): string {
 return request.headers.get(REQUEST_ID_HEADER) ?? randomUUID()
}

export interface RequestLogContext {
 requestId: string
 route: string
}

export function createRequestLogContext(request: Request, route: string): RequestLogContext {
 return {
 requestId: getRequestId(request),
 route,
 }
}

export function withLogPrefix(context: RequestLogContext, stage: string): string {
 return `[${context.route}] [request:${context.requestId}] [${stage}]`
}

