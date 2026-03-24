# `lib/insights-query`

**Neutral layer** for tracker-backed data access shared by **reports** and **analyses**: field catalog, schema fingerprint, `QueryPlanV1` AST, Prisma row loading, flatten/filter/aggregate execution, and the shared **query-plan LLM** step.

## Public API

Import from `@/lib/insights-query` (barrel in [`index.ts`](./index.ts)) for new code.

| Export area | Role |
|-------------|------|
| `schemas` | `queryPlanV1Schema`, `formatterPlanV1Schema`, `parseQueryPlan`, `parseFormatterPlan`, `structuredJsonValueSchema`, related types |
| `query-executor` | `executeQueryPlan`, `buildTrackerDataWhere`, `compareValues`, `resultSchemaFromRows`, `TrackerDataInput` |
| `compute-expr` | `getAtPath`, `evalComputeExpression`, `toNumeric` (row math for aggregates + formatter) |
| `field-catalog` / `fingerprint` | Tracker schema → LLM catalog text + stable fingerprint |
| `load-tracker-rows` | `loadTrackerDataForQueryPlan` — fair MULTI-instance quotas + cap |
| `query-plan-agent` | `generateQueryPlanV1` — report and analysis modes |
| `tracker-list` | `listTrackersForScope` — tracker picker for report/analysis APIs |

## Non-goals

- No **report intent**, **calc plan**, or **formatter apply** (those stay in [`lib/reports`](../reports/)).
- No **analysis outline / synthesis** (those stay in [`lib/analysis`](../analysis/)).
- No coupling to **Report** or **Analysis** Prisma models beyond optional future helpers.

## Consumers

- [`lib/reports/orchestrator.ts`](../reports/orchestrator.ts) — full report pipeline after intent.
- [`lib/analysis/orchestrator.ts`](../analysis/orchestrator.ts) — query + execute before synthesis.
- [`app/api/reports/[id]/route.ts`](../../app/api/reports/[id]/route.ts), [`app/api/analyses/[id]/route.ts`](../../app/api/analyses/[id]/route.ts) — metadata + fingerprint.
- Report-specific **replay overrides** stay in [`lib/reports/query-plan-overrides.ts`](../reports/query-plan-overrides.ts) but use types from here / [`lib/reports/ast-schemas`](../reports/ast-schemas.ts) barrel.

Report **intent** schemas live in [`lib/reports/report-schemas.ts`](../reports/report-schemas.ts); [`lib/reports/ast-schemas.ts`](../reports/ast-schemas.ts) re-exports this package plus report schemas for backward compatibility.
