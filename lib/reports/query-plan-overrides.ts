import { z } from 'zod'

import {
  comparisonOpSchema,
  queryPlanV1Schema,
  rowTimeFilterSchema,
  type QueryPlanV1,
} from './ast-schemas'

/** Client-sent patches applied only onto the server-stored query plan during replay. */
export const replayQueryOverridesSchema = z
  .object({
    load: z
      .object({
        /** `null` clears the row time filter. */
        rowTimeFilter: rowTimeFilterSchema.nullable().optional(),
      })
      .optional(),
    /** When set, replaces the entire row-level filter list. */
    filter: z
      .array(
        z.object({
          path: z.string(),
          op: comparisonOpSchema,
          value: z.unknown(),
        }),
      )
      .optional(),
    /** When set, replaces `aggregate.groupBy` (only valid if the base plan has `aggregate`). */
    aggregateGroupBy: z.array(z.string()).optional(),
  })
  .strict()

export type ReplayQueryOverrides = z.infer<typeof replayQueryOverridesSchema>

export function mergeQueryPlanWithOverrides(
  base: QueryPlanV1,
  overrides: ReplayQueryOverrides,
): { ok: true; plan: QueryPlanV1 } | { ok: false; error: string } {
  const next: QueryPlanV1 = structuredClone(base)

  if (overrides.load?.rowTimeFilter !== undefined) {
    if (overrides.load.rowTimeFilter === null) {
      next.load = { ...next.load }
      delete next.load.rowTimeFilter
    } else {
      next.load = { ...next.load, rowTimeFilter: overrides.load.rowTimeFilter }
    }
  }

  if (overrides.filter !== undefined) {
    next.filter = overrides.filter
  }

  if (overrides.aggregateGroupBy !== undefined) {
    if (!next.aggregate) {
      return {
        ok: false,
        error: 'This report has no aggregate step; group-by cannot be changed without Regenerate.',
      }
    }
    next.aggregate = {
      ...next.aggregate,
      groupBy: overrides.aggregateGroupBy,
    }
  }

  const parsed = queryPlanV1Schema.safeParse(next)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query plan after overrides.',
    }
  }

  return { ok: true, plan: parsed.data }
}
