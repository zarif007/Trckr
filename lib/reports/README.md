# Reports

Report-specific **recipe** pipeline: natural language → **intent** (`reportIntentSchema` in [`report-schemas.ts`](./report-schemas.ts)) → shared **query plan + execute** in [`lib/insights-query`](../insights-query/README.md) → optional **calc** → **formatter apply** → markdown/tables.

Saved **recipes** over tracker data: natural language → structured intent → validated **query plan** (v1 AST) → fetch `TrackerData` rows → optional **calc plan** (per-column **ExprNode** ASTs) → **formatter plan** (v1 AST) → markdown for the UI.

Result numbers are **not** stored. Re-running a report executes the saved query + formatter against current DB rows so time-relative questions stay correct.

## Pipeline

1. **Intent** (`reportIntentSchema` in [`report-schemas.ts`](./report-schemas.ts)) — LLM extracts metrics, grids, filters, time range, output style, `generationPlan`.
2. **Query plan** (`queryPlanV1Schema` in `@/lib/insights-query`) — LLM maps intent + field catalog to a safe AST (no SQL/JS).
3. **Execute** — `loadTrackerDataForQueryPlan` + `executeQueryPlan` in `@/lib/insights-query`: Prisma load, flatten `TrackerData.data`, filters, optional aggregate, sort, limit. Aggregate **metrics** use either a single `path` or a per-row `expression` (same AST as formatter `compute_column`) for sums like **quantity × unit_price** — not `sum(unit_price)` for “total value”.
4. **Calc** (`reportCalcIntentSchema` → `reportCalcPlanV1Schema`) — After execute, an LLM pass may list 0..N derived columns; each column’s **ExprNode** is produced by **`generateReportExprAst`** (same stack as [`app/api/generate-expr/route.ts`](../../app/api/generate-expr/route.ts): imports **`generateExpr`**, not an HTTP self-call). Rows are enriched with **`applyCalcPlanToRows`** / **`evaluateReportExprOnRow`** ([`calc-plan.ts`](./calc-plan.ts), [`report-expr.ts`](./report-expr.ts)). The persisted **`calcPlan`** JSON on `ReportDefinition` enables replay without re-running the expr LLM.
5. **Formatter plan** (`formatterPlanV1Schema` in `@/lib/insights-query`) — LLM sees column schema + sample **after** calc enrichment; emits ordered ops (`drop_columns`, `filter`, `sort`, `rename`, `limit`, `group_by`, `compute_column`).
6. **Apply** — `applyFormatterPlan` on enriched rows, then `formatOutputMarkdown`.

`compute_column` adds per-row numeric columns via a fixed expression AST: `binary` (add/subtract/multiply/divide), `unary` (abs, neg, round, ceil, floor), and `percent` (part/whole×scale, default scale 100). Operands are `{ path }` or `{ num }`; chain multiple ops for multi-step calculations.

Streaming uses **NDJSON** (`application/x-ndjson`): one JSON object per line (`ReportStreamEvent`). Each event is also appended to `ReportRunEvent` for audit.

## Replay vs regenerate

- **Replay** (`regenerate: false`): if `ReportDefinition.status === ready` and `schemaFingerprint` matches the current tracker schema fingerprint, only deterministic steps run (no LLM): execute query plan → apply saved **`calcPlan`** (if any) → apply formatter plan. If `calcPlan` is present but invalid, the definition is not replayable (`isReplayable`).
- **Regenerate** (`regenerate: true`): full pipeline; definition is overwritten on success.

Fingerprint is a short SHA-256 prefix of a stable JSON blob derived from the tracker field catalog (`fingerprintFromCatalog` in `@/lib/insights-query`).

[`ast-schemas.ts`](./ast-schemas.ts) re-exports shared query/formatter schemas from `insights-query` plus report-only types for backward-compatible imports.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/reports` | Create report shell + empty definition |
| `GET` | `/api/reports/trackers?projectId=&moduleId=` | Tracker picker options |
| `GET` | `/api/reports/[id]` | Metadata + definition summary + `staleDefinition` |
| `POST` | `/api/reports/[id]/generate` | NDJSON stream; body `{ prompt?, regenerate? }` |

## Tracker expression AST (`generate-expr` capability)

**Implemented** as orchestrator phase **`calc`** (between execute and formatter). It uses the same **ExprNode** AST and **`generateExpr`** implementation as [`app/api/generate-expr/route.ts`](../../app/api/generate-expr/route.ts); the route is only the HTTP wrapper — the report pipeline calls **`generateReportExprAst`** in [`report-generate-expr.ts`](./report-generate-expr.ts) so auth and streaming stay in one place.

That path supports **richer** row math than the formatter `compute_column` DSL (conditionals, `min`/`max`, string ops, etc.). Formatting stays in the formatter agent; **calc** only adds named columns via Expr evaluation.

### When to keep the small DSL

Use **formatter `compute_column`** / **query `expression` metrics** for simple arithmetic (fewer LLM round-trips). Use the **calc** phase + **`generateExpr`** when the user needs **full tracker expression** semantics for extra columns.

## Extending

- Bump `version` literals in Zod schemas and add migration logic in `parseQueryPlan` / `parseFormatterPlan` if shapes change.
- For heavier trackers, keep tightening `load.maxTrackerDataRows` or add a v2 executor with parameterized JSONB SQL (see plan).
