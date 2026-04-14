# `lib/insights-query`

**Neutral layer** for tracker-backed data access used by **analyses**: field catalog, schema fingerprint, `QueryPlanV1` AST, Prisma row loading, flatten/filter/aggregate execution, the shared **query-plan LLM** step, and **query-plan replay overrides** (merge client tweaks into a saved plan before execution).

## Public API

Import from `@/lib/insights-query` (barrel in [`index.ts`](./index.ts)) for new code.

| Export area | Role |
|-------------|------|
| `schemas` | `queryPlanV1Schema`, `formatterPlanV1Schema`, `parseQueryPlan`, `parseFormatterPlan`, `structuredJsonValueSchema`, related types |
| `query-plan-overrides` | `mergeQueryPlanWithOverrides`, Zod schemas for replay bodies |
| `query-executor` | `executeQueryPlan`, `buildTrackerDataWhere`, `compareValues`, `resultSchemaFromRows`, `TrackerDataInput` |
| `compute-expr` | `getAtPath`, `evalComputeExpression`, `toNumeric` (row math for aggregates) |
| `field-catalog` / `fingerprint` | Tracker schema → LLM catalog text + stable fingerprint |
| `load-tracker-rows` | `loadTrackerDataForQueryPlan` — fair MULTI-instance quotas + cap |
| `query-plan-agent` | `generateQueryPlanV1` |
| `tracker-list` | `listTrackersForScope` — tracker picker for analysis APIs |

## Non-goals

- No **analysis outline / synthesis** (those stay in [`lib/analysis`](../analysis/)).
- No coupling to the **Analysis** Prisma model beyond what callers pass (IDs, tracker schema).

## Consumers

- [`lib/analysis/orchestrator.ts`](../analysis/orchestrator.ts) — query plan → execute → synthesis; replay overrides on regenerate/replay. See [`lib/analysis/README.md`](../analysis/README.md) for caps and NDJSON contract details.
- [`app/api/analyses/[id]/route.ts`](../../app/api/analyses/[id]/route.ts) — metadata + fingerprint.
