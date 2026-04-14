# Analysis pipeline (`lib/analysis`)

Server-side orchestration for **tracker-backed analyses**: planning outline → `QueryPlanV1` (via `lib/insights-query`) → execute → synthesis document, plus a **tabular grounding** layer for the UI.

## Responsibilities

| Piece | Role |
|--------|------|
| `orchestrator.ts` | `runAnalysisPipeline`, full generation vs replay-only paths, LLM calls, persistence via `analysis-repository` |
| `stream-events.ts` | Typed NDJSON events consumed by `app/insights/lib/ndjson-timeline.ts` and the analysis page |
| `table-stream.ts` | Caps `tableRows` on the **final** event so streams and traced DB payloads stay bounded |
| `constants.ts` | Shared numeric caps (`ANALYSIS_STREAM_TABLE_ROW_CAP`, stats scan limits) |
| `query-result-summary.ts` | Bounded numeric column summaries for synthesis prompts |
| `analysis-schemas.ts` | Zod schemas for outline + document |
| `chart-hydrate.ts` | Fills `chartData` on blocks from raw query rows |

## Scalability & safety

1. **Row load** is constrained by the query plan’s `load.maxTrackerDataRows` and fair MULTI-instance logic in `lib/insights-query/load-tracker-rows.ts`.
2. **Final NDJSON payload**: `buildFinalAnalysisStreamEvent` embeds at most **`ANALYSIS_STREAM_TABLE_ROW_CAP`** rows (see `constants.ts`). The event always includes **`tableRowTotalCount`** and **`tableRowsTruncated`** when a table is present so the client can explain partial tables and CSV exports.
3. **Traced runs**: the same capped `final` object is appended to `AnalysisRunEvent`, avoiding huge JSON rows in Postgres.
4. **Synthesis context**: row sample stays capped (80); **`buildNumericColumnSummaries`** scans at most **`ANALYSIS_NUMERIC_STATS_ROW_SCAN_CAP`** rows and **`ANALYSIS_NUMERIC_STATS_MAX_COLUMNS`** columns so token use and CPU stay predictable.

## Replay vs regenerate

- **Regenerate** (`regenerate: true`): full pipeline; new outline, query plan, execution, synthesis.
- **Replay** (`regenerate: false` while definition is replayable): skips LLMs; re-executes saved (or override-merged) query plan, re-hydrates charts, refreshes document + table.

Client overrides are merged in `POST /api/analyses/[id]/generate` using `mergeQueryPlanWithOverrides` from `lib/insights-query/query-plan-overrides.ts`.

## Related docs

- Insights query engine: [`../insights-query/README.md`](../insights-query/README.md)
- Product UI: `app/analysis/[id]/page.tsx`
