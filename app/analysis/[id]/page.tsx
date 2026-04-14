"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/app/components/tracker-display/grids/data-table/data-table";
import {
  GenerationTimeline,
  GenerationTimelineStarting,
} from "@/app/insights/components/GenerationTimeline";
import { InsightPageHeader } from "@/app/insights/components/InsightPageHeader";
import { InsightPromptCard } from "@/app/insights/components/InsightPromptCard";
import { StaleDefinitionBanner } from "@/app/insights/components/StaleDefinitionBanner";
import {
  applyPhaseStreamEvent,
  consumeInsightNdjsonStream,
  type GenerationTimelineStep,
} from "@/app/insights/lib/ndjson-timeline";
import { InsightMultilinePrompt } from "@/app/insights/components/InsightMultilinePrompt";
import type { AnalysisDocumentV1 } from "@/lib/analysis/analysis-schemas";
import { ANALYSIS_STREAM_TABLE_ROW_CAP } from "@/lib/analysis/constants";
import type { AnalysisStreamEvent } from "@/lib/analysis/stream-events";
import type { QueryPlanV1 } from "@/lib/insights-query/schemas";
import {
  analysisDocumentToMarkdown,
  downloadTextFile,
  sanitizeDownloadBasename,
  tableRowsToCsv,
} from "@/lib/preview-download";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

import {
  AnalysisRecipeFilters,
  type FieldCatalogEntry,
} from "../components/AnalysisRecipeFilters";
import { AnalysisDocumentView } from "../components/AnalysisDocumentView";
import {
  buildReplayQueryOverrides,
  filterDraftFromQueryPlan,
  type FilterRowDraft,
} from "../lib/replay-overrides";

type AnalysisMeta = {
  id: string;
  name: string;
  projectId: string;
  moduleId: string | null;
  trackerSchemaId: string;
  trackerName: string | null;
  projectName: string | null;
  moduleName: string | null;
  definition: {
    userPrompt: string;
    status: string;
    schemaFingerprint: string | null;
    readyAt: string | null;
    lastError: string | null;
  } | null;
  staleDefinition: boolean;
  fieldCatalog: FieldCatalogEntry[];
  recipe: {
    queryPlan: QueryPlanV1;
    formatterOnlyGroupBy: boolean;
  } | null;
  document: AnalysisDocumentV1 | null;
};

type ArtifactKind = "outline" | "query_plan" | "document";

const ARTIFACT_SAVED_LABEL: Record<ArtifactKind, string> = {
  outline: "Outline saved",
  query_plan: "Query plan saved",
  document: "Document saved",
};

function analysisTableColumnKeys(rows: Record<string, unknown>[]): string[] {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
    (k) => !k.startsWith("__"),
  );
  return keys;
}

function buildAnalysisDataColumns(
  keys: string[],
): ColumnDef<Record<string, unknown>, unknown>[] {
  return keys.map((key) => ({
    id: key,
    accessorKey: key,
    header: key,
    cell: ({ getValue }) => {
      const v = getValue();
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    },
  }));
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [meta, setMeta] = useState<AnalysisMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<GenerationTimelineStep[]>([]);
  const [document, setDocument] = useState<AnalysisDocumentV1 | null>(null);
  const [tableRows, setTableRows] = useState<Record<string, unknown>[] | null>(
    null,
  );
  const [tableStreamMeta, setTableStreamMeta] = useState<{
    total: number;
    truncated: boolean;
  } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [stepDetailsOpen, setStepDetailsOpen] = useState<
    Record<number, boolean>
  >({});
  const didAutoReplayRef = useRef(false);
  const recipeFingerprintRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const [rowTimeFilter, setRowTimeFilter] = useState<
    QueryPlanV1["load"]["rowTimeFilter"] | null
  >(null);
  const [filterRows, setFilterRows] = useState<FilterRowDraft[]>([]);
  const [aggregateGroupBy, setAggregateGroupBy] = useState<string[]>([]);
  const [lastAppliedFilterKey, setLastAppliedFilterKey] = useState<
    string | null
  >(null);

  const filterApplyKey = useMemo(() => {
    if (!meta?.recipe) return "";
    return JSON.stringify(
      buildReplayQueryOverrides({
        rowTimeFilter,
        filterRows,
        queryPlan: meta.recipe.queryPlan,
        aggregateGroupBy,
      }),
    );
  }, [meta?.recipe, rowTimeFilter, filterRows, aggregateGroupBy]);

  const loadMeta = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(`/api/analyses/${id}`);
    if (res.status === 401) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`/analysis/${id}`)}`,
      );
      return;
    }
    if (!res.ok) {
      setLoadError("Analysis not found.");
      return;
    }
    const data = (await res.json()) as AnalysisMeta;
    setMeta(data);
    setPrompt(data.definition?.userPrompt ?? "");
    if (data.document) setDocument(data.document);
  }, [id, router]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    didAutoReplayRef.current = false;
  }, [id]);

  useEffect(() => {
    recipeFingerprintRef.current = null;
    setLastAppliedFilterKey(null);
  }, [id]);

  useEffect(() => {
    if (!meta?.recipe) {
      setRowTimeFilter(null);
      setFilterRows([]);
      setAggregateGroupBy([]);
      setLastAppliedFilterKey(null);
      return;
    }
    const fp = JSON.stringify(meta.recipe.queryPlan);
    if (recipeFingerprintRef.current === fp) return;
    recipeFingerprintRef.current = fp;
    setLastAppliedFilterKey(null);
    const d = filterDraftFromQueryPlan(meta.recipe.queryPlan);
    setRowTimeFilter(d.rowTimeFilter);
    setFilterRows(d.filterRows);
    setAggregateGroupBy(d.aggregateGroupBy);
  }, [meta?.recipe]);

  useEffect(() => {
    if (document == null || !meta?.recipe || !filterApplyKey) return;
    setLastAppliedFilterKey((prev) => (prev === null ? filterApplyKey : prev));
  }, [document, meta?.recipe, filterApplyKey]);

  useEffect(() => {
    if (running && steps.length > 0) {
      const last = steps.length - 1;
      setStepDetailsOpen({ [last]: true });
    }
  }, [running, steps.length]);

  useEffect(() => {
    if (!running && document !== null) setStepDetailsOpen({});
  }, [running, document]);

  const handleStepDetailsOpenChange = useCallback(
    (idx: number, open: boolean) => {
      setStepDetailsOpen((prev) => ({ ...prev, [idx]: open }));
    },
    [],
  );

  const runStream = useCallback(
    async (opts: { regenerate: boolean }) => {
      if (opts.regenerate) {
        didAutoReplayRef.current = true;
      }
      streamAbortRef.current?.abort();
      const abortController = new AbortController();
      streamAbortRef.current = abortController;
      setRunning(true);
      setStreamError(null);
      setStepDetailsOpen({});
      setSteps([]);
      setDocument(null);
      setTableRows(null);
      setTableStreamMeta(null);
      const replayableNow =
        meta?.definition?.status === "ready" &&
        !meta.staleDefinition &&
        meta.recipe != null;
      const body: {
        prompt: string;
        regenerate: boolean;
        replayQueryOverrides?: ReturnType<typeof buildReplayQueryOverrides>;
      } = {
        prompt: prompt.trim(),
        regenerate: opts.regenerate,
      };
      if (!opts.regenerate && replayableNow && meta.recipe) {
        body.replayQueryOverrides = buildReplayQueryOverrides({
          rowTimeFilter,
          filterRows,
          queryPlan: meta.recipe.queryPlan,
          aggregateGroupBy,
        });
      }
      let pipelineError: string | null = null;
      try {
        const res = await fetch(`/api/analyses/${id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          pipelineError =
            (j as { error?: string }).error || "Request failed.";
          setStreamError(pipelineError);
          return;
        }

        await consumeInsightNdjsonStream({
          body: res.body,
          onPhaseEvent: (ev) =>
            setSteps((prev) => applyPhaseStreamEvent(prev, ev)),
          onFinal: (raw) => {
            const ev = raw as AnalysisStreamEvent;
            if (ev.t !== "final") return;
            setDocument(ev.document);
            if (ev.tableRows !== undefined) {
              setTableRows(ev.tableRows);
              if (typeof ev.tableRowTotalCount === "number") {
                setTableStreamMeta({
                  total: ev.tableRowTotalCount,
                  truncated: ev.tableRowsTruncated === true,
                });
              } else {
                setTableStreamMeta(null);
              }
            }
          },
          onStreamError: (message) => {
            pipelineError = message;
            setStreamError(message);
          },
        });
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Request failed.";
        pipelineError = message;
        setStreamError(message);
      } finally {
        setRunning(false);
        if (
          pipelineError === null &&
          body.replayQueryOverrides !== undefined &&
          !abortController.signal.aborted
        ) {
          setLastAppliedFilterKey(JSON.stringify(body.replayQueryOverrides));
        }
        if (!abortController.signal.aborted) {
          void loadMeta();
        }
      }
    },
    [
      id,
      prompt,
      loadMeta,
      meta?.definition?.status,
      meta?.staleDefinition,
      meta?.recipe,
      rowTimeFilter,
      filterRows,
      aggregateGroupBy,
    ],
  );

  const handleApplyFilters = useCallback(() => {
    void runStream({ regenerate: false });
  }, [runStream]);

  const handleDownloadSpreadsheet = useCallback(() => {
    if (!meta || !tableRows?.length) return;
    const keys = analysisTableColumnKeys(tableRows);
    const cols = keys.length > 0 ? keys : Object.keys(tableRows[0]!);
    const csv = tableRowsToCsv(tableRows, cols);
    const base = sanitizeDownloadBasename(meta.name);
    const suffix =
      tableStreamMeta?.truncated === true ? "_table_preview" : "";
    downloadTextFile(`${base}${suffix}.csv`, csv, "text/csv;charset=utf-8");
  }, [tableRows, meta, tableStreamMeta?.truncated]);

  useEffect(() => {
    if (!meta || meta.id !== id || didAutoReplayRef.current) return;
    const canAutoReplay =
      meta.definition?.status === "ready" &&
      !meta.staleDefinition &&
      meta.document != null &&
      meta.recipe != null;
    if (!canAutoReplay) return;
    didAutoReplayRef.current = true;
    void runStream({ regenerate: false });
  }, [meta, id, runStream]);

  const analysisColumns = useMemo(() => {
    if (!tableRows?.length) return [];
    const keys = analysisTableColumnKeys(tableRows);
    return buildAnalysisDataColumns(
      keys.length > 0 ? keys : Object.keys(tableRows[0]!),
    );
  }, [tableRows]);

  const showDataTable = Boolean(
    tableRows && tableRows.length > 0 && analysisColumns.length > 0,
  );

  const needsPrompt =
    !meta?.definition ||
    meta.definition.status === "draft" ||
    meta.definition.status === "error" ||
    meta.staleDefinition;

  const canReplay =
    meta?.definition?.status === "ready" &&
    !meta.staleDefinition &&
    meta.document != null &&
    meta.recipe != null;

  const canRunGenerate = Boolean(prompt.trim()) && !running;

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canRunGenerate) void runStream({ regenerate: true });
    }
  };

  const handleDownloadDocument = useCallback(() => {
    if (!document || !meta) return;
    const readyAt = meta.definition?.readyAt;
    const asOfLabel =
      readyAt && !Number.isNaN(new Date(readyAt).getTime())
        ? new Date(readyAt).toLocaleString(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          })
        : null;
    const contextLine =
      [meta.projectName, meta.moduleName, meta.trackerName]
        .filter(Boolean)
        .join(" · ") || null;
    const md = analysisDocumentToMarkdown({
      title: meta.name,
      asOfLabel,
      contextLine,
      document,
    });
    const base = sanitizeDownloadBasename(meta.name);
    downloadTextFile(`${base}.md`, md, "text/markdown;charset=utf-8");
  }, [document, meta]);

  const backHref = `/project/${meta?.projectId ?? ""}`;

  const filtersDirty =
    meta?.recipe != null &&
    lastAppliedFilterKey !== null &&
    filterApplyKey !== lastAppliedFilterKey;

  const filterBaselineReady =
    meta?.recipe != null &&
    (lastAppliedFilterKey !== null || document !== null);

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        {loadError}
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => router.push("/dashboard")}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading analysis…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6">
      <InsightPageHeader
        backHref={backHref}
        title={meta.name}
        trackerName={meta.trackerName}
        projectName={meta.projectName}
        moduleName={meta.moduleName}
      />

      {meta.staleDefinition && <StaleDefinitionBanner />}

      <InsightPromptCard
        label="What should this analysis cover?"
        labelHtmlFor="analysis-prompt"
        prompt={
          <InsightMultilinePrompt
            id="analysis-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder="e.g. Summarize trends, highlight risks, and chart volume by category over time"
            className="shrink-0"
            disabled={running}
          />
        }
        footer={
          <>
            {canReplay && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={running}
                onClick={() => void runStream({ regenerate: false })}
                className="rounded-sm mr-auto"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh data
              </Button>
            )}
            <Button
              type="button"
              size="default"
              disabled={!canRunGenerate}
              onClick={() => void runStream({ regenerate: true })}
              className="rounded-sm gap-2"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {needsPrompt ? "Generate" : "Regenerate"}
            </Button>
          </>
        }
        belowCard={
          <>
            {meta.definition?.lastError && !running && (
              <p className="text-xs text-destructive">
                Last error: {meta.definition.lastError}
              </p>
            )}
            {streamError && (
              <p className="text-xs text-destructive">{streamError}</p>
            )}
          </>
        }
      />

      <GenerationTimeline
        steps={steps}
        running={running}
        artifactLabels={ARTIFACT_SAVED_LABEL}
        stepDetailsOpen={stepDetailsOpen}
        onStepDetailsOpenChange={handleStepDetailsOpenChange}
      />
      <GenerationTimelineStarting
        running={running}
        emptySteps={steps.length === 0}
      />

      {meta.recipe && (
        <div className="mt-8">
          <AnalysisRecipeFilters
            disabled={running || meta.staleDefinition}
            queryPlan={meta.recipe.queryPlan}
            formatterOnlyGroupBy={meta.recipe.formatterOnlyGroupBy}
            fieldCatalog={meta.fieldCatalog}
            userRequirementPrompt={meta.definition?.userPrompt ?? null}
            defaultOpen={false}
            rowTimeFilter={rowTimeFilter}
            onRowTimeFilterChange={setRowTimeFilter}
            filterRows={filterRows}
            onFilterRowsChange={setFilterRows}
            aggregateGroupBy={aggregateGroupBy}
            onAggregateGroupByChange={setAggregateGroupBy}
            onApply={handleApplyFilters}
            applyDisabled={
              running ||
              !filterBaselineReady ||
              !filtersDirty ||
              meta.staleDefinition
            }
            applying={running}
            filtersDirty={filtersDirty}
            filterBaselineReady={filterBaselineReady}
          />
        </div>
      )}

      {showDataTable && (
        <div className="mt-8 space-y-3">
          {tableStreamMeta?.truncated === true && (
            <p
              className={cn(
                "text-xs text-muted-foreground rounded-sm border px-3 py-2",
                theme.uiChrome.floating,
              )}
            >
              Showing the first {ANALYSIS_STREAM_TABLE_ROW_CAP.toLocaleString()}{" "}
              of {tableStreamMeta.total.toLocaleString()} result rows in the
              browser (stream size limit). CSV download matches this preview.
              Narrow filters or lower the query plan row cap to work with fewer
              rows.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-sm gap-1.5"
              onClick={handleDownloadSpreadsheet}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download spreadsheet
            </Button>
          </div>
          <div
            className={cn(
              "overflow-hidden rounded-sm border bg-card/40",
              theme.uiChrome.floating,
            )}
          >
            <DataTable<Record<string, unknown>, unknown>
              columns={analysisColumns}
              data={tableRows ?? []}
              addable={false}
              editable={false}
              deletable={false}
              editLayoutAble={false}
              showRowDetails={false}
            />
          </div>
        </div>
      )}

      {document && (
        <div
          className={cn("mt-10 border-t pt-10 space-y-3", theme.uiChrome.border)}
        >
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-sm gap-1.5"
              onClick={handleDownloadDocument}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download document
            </Button>
          </div>
          <div
            className={cn(
              "overflow-hidden rounded-sm border bg-card/40",
              theme.patterns.card,
            )}
          >
            <AnalysisDocumentView
              document={document}
              header={{
                title: meta.name,
                asOfIso: meta.definition?.readyAt ?? null,
                projectName: meta.projectName,
                moduleName: meta.moduleName,
                trackerName: meta.trackerName,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
