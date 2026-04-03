import type { QueryPlanV1 } from './schemas'

/**
 * MULTI trackers: when the plan is a **global** numeric rollup (no groupBy, sum/avg metrics),
 * every instance label should contribute fairly to the loaded row set. The generic
 * "many distinct labels" fast path (newest N rows globally) biases which instances appear
 * and breaks pooled totals.
 */
export function needsMultiFairPoolForAggregates(plan: QueryPlanV1): boolean {
 const agg = plan.aggregate
 if (!agg || agg.metrics.length === 0) return false
 if (agg.groupBy.length > 0) return false
 return agg.metrics.some((m) => m.op === 'sum' || m.op === 'avg')
}
