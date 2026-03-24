import { createRequestLogContext, jsonError } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createModuleForProject, createProjectForUser } from '@/lib/repositories'
import { parseCreateBody } from '../lib/validation'

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'ai-project/create')
  void logContext
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body. Expected JSON with "plan".', 400)
  }

  const parsed = parseCreateBody(body)
  if (!parsed.ok) {
    return jsonError(parsed.error, parsed.status)
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', step: 'project', message: 'Creating project...' }) + '\n'))

        const projectName = parsed.plan.project?.name?.trim() || 'Untitled project'
        const project = await createProjectForUser(authResult.user.id, projectName)

        controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', step: 'project', message: 'Project created' }) + '\n'))

        const modules = parsed.plan.modules ?? []
        const createdModules: Array<{ name: string; id: string }> = []

        for (const planModule of modules) {
          const name = planModule.name?.trim()
          if (!name) continue

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', step: 'module', name, message: `Creating module: ${name}` }) + '\n'))

          const created = await createModuleForProject(project.id, authResult.user.id, name)
          if (created) {
            createdModules.push({ name: created.name ?? name, id: created.id })
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', step: 'module', name, message: 'Module created' }) + '\n'))
          }
        }

        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'complete',
          projectId: project.id,
          modules: createdModules,
        }) + '\n'))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create project.'
        console.error('[ai-project/create] Failed to create project:', error)
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message }) + '\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
