import {
  getDynamicOptions,
  getRegisteredDynamicOptionsIds,
} from '../registry'
import type {
  DynamicOptionsContext,
  DynamicOptionsRuntimeContext,
  DynamicOptionsResolveInput,
  DynamicOptionsResolveResult,
} from '../types'
import { getCachedDynamicOptions, setCachedDynamicOptions } from './cache'
import { executeDynamicOptionFunction } from './executor'

function nowIso(nowMs: number): string {
  return new Date(nowMs).toISOString()
}

function withMeta(
  result: Omit<DynamicOptionsResolveResult, 'meta'>,
  meta: DynamicOptionsResolveResult['meta'],
): DynamicOptionsResolveResult {
  return {
    options: result.options,
    warnings: result.warnings,
    meta,
  }
}

function buildContextVersion(context: DynamicOptionsContext): string {
  const payload = {
    grids: context.grids.map((g) => g.id),
    fields: context.fields.map((f) => `${f.id}:${f.dataType}`),
    layoutNodes: (context.layoutNodes ?? []).map((n) => `${n.gridId}.${n.fieldId}`),
    sections: (context.sections ?? []).map((s) => `${s.id}:${s.tabId}`),
    gridData: context.gridData ?? {},
  }
  try {
    return JSON.stringify(payload)
  } catch {
    return `${payload.grids.length}:${payload.fields.length}`
  }
}

function buildCacheKey(
  functionId: string,
  args: Record<string, unknown> | undefined,
  contextVersion: string,
  runtimeVersion: string,
): string {
  let argsJson = ''
  try {
    argsJson = JSON.stringify(args ?? {})
  } catch {
    argsJson = ''
  }
  return `${functionId}::${argsJson}::${contextVersion}::${runtimeVersion}`
}

function buildRuntimeVersion(runtime: DynamicOptionsRuntimeContext | undefined): string {
  if (!runtime) return ''
  try {
    return JSON.stringify({
      currentGridId: runtime.currentGridId,
      currentFieldId: runtime.currentFieldId,
      rowIndex: runtime.rowIndex,
      currentRow: runtime.currentRow ?? {},
    })
  } catch {
    return `${runtime.currentGridId ?? ''}:${runtime.currentFieldId ?? ''}:${runtime.rowIndex ?? ''}`
  }
}

function isBuiltInFunctionId(functionId: string): boolean {
  return getRegisteredDynamicOptionsIds().includes(functionId)
}

export async function resolveDynamicOptions(
  input: DynamicOptionsResolveInput,
): Promise<DynamicOptionsResolveResult> {
  const startedAt = Date.now()
  const { functionId, args, forceRefresh, cacheTtlSecondsOverride, remoteResolver } = input
  const context: DynamicOptionsContext = input.runtime
    ? {
      ...input.context,
      runtime: {
        ...(input.context.runtime ?? {}),
        ...input.runtime,
      },
    }
    : input.context

  if (!functionId || typeof functionId !== 'string') {
    return withMeta(
      {
        options: [],
        warnings: ['Missing dynamic options function id'],
      },
      {
        fromCache: false,
        fetchedAt: nowIso(startedAt),
        durationMs: 0,
        source: 'unknown',
      },
    )
  }

  if (isBuiltInFunctionId(functionId)) {
    const options = getDynamicOptions(functionId, context)
    return withMeta(
      {
        options,
      },
      {
        fromCache: false,
        fetchedAt: nowIso(startedAt),
        durationMs: Date.now() - startedAt,
        source: 'builtin',
      },
    )
  }

  const definition = context.dynamicOptions?.functions?.[functionId]
  if (!definition) {
    return withMeta(
      {
        options: [],
        warnings: [`Dynamic options function "${functionId}" was not found`],
      },
      {
        fromCache: false,
        fetchedAt: nowIso(startedAt),
        durationMs: Date.now() - startedAt,
        source: 'unknown',
      },
    )
  }

  const ttlSeconds =
    cacheTtlSecondsOverride ??
    definition.cache?.ttlSeconds ??
    300

  const cacheKey = buildCacheKey(
    functionId,
    args,
    buildContextVersion(context),
    buildRuntimeVersion(context.runtime),
  )
  const nowMs = Date.now()
  if (!forceRefresh) {
    const cached = getCachedDynamicOptions(cacheKey, nowMs)
    if (cached) {
      return {
        ...cached,
        meta: {
          ...cached.meta,
          fromCache: true,
          durationMs: Date.now() - startedAt,
        },
      }
    }
  }

  const executed = await executeDynamicOptionFunction({
    definition,
    context,
    args,
    resolveBuiltIn: (id, ctx) => getDynamicOptions(id, ctx),
    allowHttpGet: input.allowHttpGet,
    secretResolver: input.secretResolver,
    aiExtractor: input.aiExtractor,
  })

  let result: DynamicOptionsResolveResult
  if (executed.requiresRemote) {
    if (!remoteResolver) {
      result = withMeta(
        {
          options: [],
          warnings: [
            `Function "${functionId}" requires server execution but no remote resolver is configured`,
          ],
        },
        {
          fromCache: false,
          fetchedAt: nowIso(startedAt),
          durationMs: Date.now() - startedAt,
          source: 'remote_custom',
        },
      )
    } else {
      const remote = await remoteResolver({
        functionId,
        context,
        runtime: context.runtime,
        args,
        forceRefresh,
        cacheTtlSecondsOverride,
      })
      result = {
        options: remote.options.slice(0, 500),
        warnings: remote.warnings,
        meta: {
          ...remote.meta,
          durationMs: Date.now() - startedAt,
        },
      }
    }
  } else {
    result = withMeta(
      {
        options: executed.options.slice(0, 500),
        warnings: executed.warnings,
      },
      {
        fromCache: false,
        fetchedAt: nowIso(startedAt),
        durationMs: Date.now() - startedAt,
        source: executed.source,
      },
    )
  }

  const { expiresAt } = setCachedDynamicOptions(cacheKey, result, ttlSeconds, nowMs)
  result.meta = {
    ...result.meta,
    expiresAt: new Date(expiresAt).toISOString(),
  }

  return result
}

export function resolveDynamicOptionsSync(
  functionId: string,
  context: DynamicOptionsContext,
): DynamicOptionsResolveResult {
  const startedAt = Date.now()

  if (isBuiltInFunctionId(functionId)) {
    return {
      options: getDynamicOptions(functionId, context),
      meta: {
        fromCache: false,
        fetchedAt: nowIso(startedAt),
        durationMs: Date.now() - startedAt,
        source: 'builtin',
      },
    }
  }

  return {
    options: [],
    warnings: [`Function "${functionId}" needs async resolution`],
    meta: {
      fromCache: false,
      fetchedAt: nowIso(startedAt),
      durationMs: Date.now() - startedAt,
      source: 'unknown',
    },
  }
}
