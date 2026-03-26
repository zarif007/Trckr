import { z } from 'zod'
import { multiAgentSchema, type MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { getDefaultAiProvider, logAiError, logAiStage, getConfiguredMaxOutputTokens } from '@/lib/ai'
import { createRequestLogContext, jsonError } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { scheduleRecordLlmUsage } from '@/lib/llm-usage'
import { createTrackerForUser } from '@/lib/repositories'
import { getCombinedSystemPrompt } from '@/app/api/generate-tracker/lib/prompts'
import { buildTrackerBuilderPrompt } from '../lib/prompts'
import { parseBuildBody } from '../lib/validation'
import { applyMasterDataBindings } from '@/lib/master-data/builder'
import { resolveMasterDataDefaultScope } from '@/lib/master-data/resolve-default'
import { normalizeMasterDataScope } from '@/lib/master-data-scope'

const trackerSpecSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  module: z.string().nullable().optional(),
  prompt: z.string(),
  instance: z.enum(['SINGLE', 'MULTI']).optional(),
  versionControl: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  masterDataScope: z.enum(['tracker', 'module', 'project']).optional(),
}).passthrough()

const projectContextSchema = z
  .object({
    project: z.object({
      name: z.string(),
      description: z.string().optional(),
      industry: z.string().optional(),
      goals: z.array(z.string()).optional(),
    }),
    modules: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough()

function extractProgressFromPartial(partial: unknown): string | null {
  if (!partial || typeof partial !== 'object') return null
  const obj = partial as Record<string, unknown>
  const tracker = obj.tracker as Record<string, unknown> | undefined
  if (!tracker) return null

  const fields = tracker.fields as Array<{ ui?: { label?: string }; id?: string }> | undefined
  if (fields?.length) {
    const last = fields[fields.length - 1]
    const label = last?.ui?.label ?? last?.id ?? 'field'
    return `Building field: ${label}`
  }

  const grids = tracker.grids as Array<{ name?: string; id?: string }> | undefined
  if (grids?.length) {
    const last = grids[grids.length - 1]
    const name = last?.name ?? last?.id ?? 'grid'
    return `Building grid: ${name}`
  }

  if (tracker.name) return 'Designing schema...'
  if (tracker.tabs && Array.isArray(tracker.tabs) && tracker.tabs.length) return 'Adding tabs...'
  if (tracker.sections && Array.isArray(tracker.sections) && tracker.sections.length) return 'Adding sections...'

  return null
}

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, 'ai-project/build-tracker')
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body. Expected JSON with "projectId" and "trackerSpec".', 400)
  }

  const parsed = parseBuildBody(body)
  if (!parsed.ok) {
    return jsonError(parsed.error, parsed.status)
  }

  const trackerSpec = trackerSpecSchema.parse(parsed.trackerSpec)
  const contextParsed = projectContextSchema.safeParse(parsed.projectContext)
  if (!contextParsed.success) {
    const issue = contextParsed.error.issues[0]
    return jsonError(issue?.message ?? 'Invalid projectContext', 400)
  }

  const projectContext = contextParsed.data

  const ownedProject = await prisma.project.findFirst({
    where: { id: parsed.projectId, userId: authResult.user.id },
    select: { id: true },
  })
  if (!ownedProject) {
    return jsonError('Project not found or access denied.', 403)
  }

  try {
    const provider = getDefaultAiProvider()
    const system = getCombinedSystemPrompt()
    const defaultScopeResolution = await resolveMasterDataDefaultScope({
      projectId: parsed.projectId,
      userId: authResult.user.id,
      moduleId: parsed.moduleId ?? null,
    })
    const masterDataScope =
      normalizeMasterDataScope(trackerSpec.masterDataScope) ??
      defaultScopeResolution.inheritedDefault ??
      'tracker'

    const prompt = buildTrackerBuilderPrompt({
      project: projectContext.project,
      modules: projectContext.modules,
      tracker: {
        name: trackerSpec.name,
        description: trackerSpec.description,
        module: trackerSpec.module,
        prompt: trackerSpec.prompt,
        instance: trackerSpec.instance ?? 'SINGLE',
        versionControl: trackerSpec.versionControl ?? false,
        autoSave: trackerSpec.autoSave ?? true,
        masterDataScope,
      },
    })

    const maxOutputTokens = getConfiguredMaxOutputTokens()
    logAiStage(logContext, 'request', `Building tracker: ${trackerSpec.name}`)

    const result = provider.streamObject({
      system,
      prompt,
      schema: multiAgentSchema,
      maxOutputTokens,
      onFinish: ({ error: validationError }) => {
        if (validationError) logAiError(logContext, 'stream-finish-validation', validationError)
      },
    })

    const encoder = new TextEncoder()
    let lastProgress = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const resultAny = result as {
            partialObjectStream?: AsyncIterable<unknown>
            object: Promise<MultiAgentSchema>
            usage: Promise<import('ai').LanguageModelUsage>
          }
          const partialStream = resultAny.partialObjectStream
          if (partialStream && typeof partialStream[Symbol.asyncIterator] === 'function') {
            for await (const partial of partialStream) {
              const msg = extractProgressFromPartial(partial)
              if (msg && msg !== lastProgress) {
                lastProgress = msg
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', message: msg }) + '\n'))
              }
            }
          }

          const fullObject = await resultAny.object
          let usage: import('ai').LanguageModelUsage | undefined
          try {
            usage = await resultAny.usage
          } catch {
            usage = undefined
          }

          const trackerSchema = fullObject?.tracker
          if (!trackerSchema) {
            if (usage) {
              scheduleRecordLlmUsage({
                userId: authResult.user.id,
                source: 'ai-project-build-tracker',
                usage,
                projectId: parsed.projectId,
                trackerSchemaId: null,
              })
            }
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'error', message: 'AI did not return a tracker schema.' }) + '\n',
              ),
            )
            controller.close()
            return
          }

          const resolvedName =
            trackerSpec.name?.trim() || (trackerSchema as { name?: string }).name || 'Untitled tracker'
          let createdTracker: { id: string; name: string | null; moduleId: string | null }
          try {
            const schemaWithScope = {
              ...(trackerSchema as Record<string, unknown>),
              masterDataScope,
            }
            const masterDataResult = await applyMasterDataBindings({
              tracker: schemaWithScope,
              scope: masterDataScope,
              projectId: parsed.projectId,
              moduleId: parsed.moduleId ?? null,
              userId: authResult.user.id,
            })

            createdTracker = await createTrackerForUser({
              userId: authResult.user.id,
              name: resolvedName,
              schema: masterDataResult.tracker as object,
              projectId: parsed.projectId,
              moduleId: parsed.moduleId ?? undefined,
              instance: trackerSpec.instance === 'MULTI' ? 'MULTI' : 'SINGLE',
              versionControl: trackerSpec.versionControl ?? false,
              autoSave: trackerSpec.autoSave ?? true,
            })
          } catch (createErr) {
            if (usage) {
              scheduleRecordLlmUsage({
                userId: authResult.user.id,
                source: 'ai-project-build-tracker',
                usage,
                projectId: parsed.projectId,
                trackerSchemaId: null,
              })
            }
            logAiError(logContext, 'create-tracker', createErr)
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message:
                    createErr instanceof Error ? createErr.message : 'Failed to save tracker.',
                }) + '\n',
              ),
            )
            controller.close()
            return
          }

          if (usage) {
            scheduleRecordLlmUsage({
              userId: authResult.user.id,
              source: 'ai-project-build-tracker',
              usage,
              projectId: parsed.projectId,
              trackerSchemaId: createdTracker.id,
            })
          }

          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete',
            trackerId: createdTracker.id,
            name: createdTracker.name,
            moduleId: createdTracker.moduleId ?? undefined,
          }) + '\n'))
        } catch (error) {
          logAiError(logContext, 'stream-error', error)
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to build tracker.',
          }) + '\n'))
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
  } catch (error) {
    logAiError(logContext, 'route-error', error)
    return jsonError('Failed to build tracker. Please try again.', 500)
  }
}
