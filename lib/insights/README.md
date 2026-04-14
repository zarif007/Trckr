# Insights pipeline (analyses)

Shared server and client pieces for **tracker-backed analyses**: field catalog → `QueryPlanV1` → `executeQueryPlan` → synthesis, with optional **client-side replay** of the saved query plan (filters, caps) before re-execution.

## Architecture

```mermaid
flowchart LR
  subgraph shared [lib/insights-query]
    QP[generateQueryPlanV1]
    CAT[catalog + executeQueryPlan]
    RO[query-plan overrides]
  end
  subgraph analysis [Analysis pipeline]
    AO[outline LLM]
    QP
    EX[execute]
    SY[synthesis LLM]
    AO --> QP --> EX --> SY
  end
  RO -.->|replay merge| EX
  CAT --> EX
```

## Server

| Concern | Location |
|--------|----------|
| Shared query execution + schemas + row load | [`lib/insights-query`](../insights-query/README.md) (`generateQueryPlanV1`, `executeQueryPlan`, `loadTrackerDataForQueryPlan`, …) |
| Query AST rules (single source of truth for the query-plan model) | `lib/prompts/report-query-plan.ts` (`getReportQueryPlanSystemPrompt`) |
| Analysis outline schema (no embedded query plan) | `lib/analysis/analysis-schemas.ts` (`analysisOutlineOnlySchema`) |
| Analysis orchestration | [`lib/analysis/orchestrator.ts`](../analysis/orchestrator.ts) — see [`lib/analysis/README.md`](../analysis/README.md) |
| Traced NDJSON runs (DB + stream) | `lib/insights/with-traced-run.ts` (`withTracedRun`) |

LLM usage sources include `analysis-query-plan`, `analysis-planning`, `analysis-synthesis`, etc., so dashboards can split costs by step.

## Client

| Concern | Location |
|--------|----------|
| Phase timeline state + NDJSON reader | `app/insights/lib/ndjson-timeline.ts` (`applyPhaseStreamEvent`, `consumeInsightNdjsonStream`) |
| Timeline UI | `app/insights/components/GenerationTimeline.tsx` |
| Page chrome (header, stale banner, prompt shell) | `app/insights/components/InsightPageHeader.tsx`, `StaleDefinitionBanner.tsx`, `InsightPromptCard.tsx` |
| Multiline prompt (analysis) | `app/insights/components/InsightMultilinePrompt.tsx` |
| New analysis dialog | `app/insights/components/NewTrackerBackedItemDialog.tsx` |

Filters, data table, CSV export, and the analysis document live on `app/analysis/[id]/page.tsx`.

## Out of scope here

- **Per-section query plans** (future extension to `generateQueryPlanV1`).
