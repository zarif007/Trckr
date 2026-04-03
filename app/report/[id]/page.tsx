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
import Markdown from "react-markdown";
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
import {
  ReportRecipeFilters,
  type FieldCatalogEntry,
} from "@/app/report/components/ReportRecipeFilters";
import {
  buildReplayQueryOverrides,
  filterDraftFromQueryPlan,
  type FilterRowDraft,
} from "@/app/report/lib/replay-overrides";
import type { QueryPlanV1 } from "@/lib/reports/ast-schemas";
import type { ReportStreamEvent } from "@/lib/reports/stream-events";
import {
  downloadTextFile,
  sanitizeDownloadBasename,
  tableRowsToCsv,
} from "@/lib/preview-download";

type ReportMeta = {
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
};

type ArtifactKind = "intent" | "query_plan" | "formatter_plan" | "calc_plan";

const ARTIFACT_SAVED_LABEL: Record<ArtifactKind, string> = {
  intent: "Intent captured",
  query_plan: "Query plan compiled",
  formatter_plan: "Formatter ready",
  calc_plan: "Calculations configured",
};

function reportTableColumnKeys(rows: Record<string, unknown>[]): string[] {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
    (k) => !k.startsWith("__"),
  );
  return keys;
}

function buildReportDataColumns(
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

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<GenerationTimelineStep[]>([]);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [preambleMarkdown, setPreambleMarkdown] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<Record<string, unknown>[] | null>(
    null,
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  /** Per-step detail panels: only the latest step stays open while streaming; all close when the run finishes. */
  const [stepDetailsOpen, setStepDetailsOpen] = useState<
    Record<number, boolean>
  >({});
  /** One auto-replay per navigation to this report id (saved recipe = ready + not stale). */
  const didAutoReplayRef = useRef(false);
  const recipeFingerprintRef = useRef<string | null>(null);

  const [rowTimeFilter, setRowTimeFilter] = useState<
    QueryPlanV1["load"]["rowTimeFilter"] | null
  >(null);
  const [filterRows, setFilterRows] = useState<FilterRowDraft[]>([]);
  const [aggregateGroupBy, setAggregateGroupBy] = useState<string[]>([]);
  /** Serialized `replayQueryOverrides` last applied to the report below; `null` until baseline is set. */
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
    const res = await fetch(`/api/reports/${id}`);
    if (res.status === 401) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`/report/${id}`)}`,
      );
      return;
    }
    if (!res.ok) {
      setLoadError("Report not found.");
      return;
    }
    const data = (await res.json()) as ReportMeta;
    setMeta(data);
    setPrompt(data.definition?.userPrompt ?? "");
  }, [id, router]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

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
    if (markdown == null || !meta?.recipe || !filterApplyKey) return;
    setLastAppliedFilterKey((prev) => (prev === null ? filterApplyKey : prev));
  }, [markdown, meta?.recipe, filterApplyKey]);

  useEffect(() => {
    if (running && steps.length > 0) {
      const last = steps.length - 1;
      setStepDetailsOpen({ [last]: true });
    }
  }, [running, steps.length]);

  useEffect(() => {
    if (!running && markdown !== null) setStepDetailsOpen({});
  }, [running, markdown]);

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
      setRunning(true);
      setStreamError(null);
      setStepDetailsOpen({});
      setSteps([]);
      setMarkdown(null);
      setPreambleMarkdown(null);
      setTableRows(null);
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
      const res = await fetch(`/api/reports/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setStreamError((j as { error?: string }).error || "Request failed.");
        setRunning(false);
        return;
      }

      let pipelineError: string | null = null;
      try {
        await consumeInsightNdjsonStream({
          body: res.body,
          onPhaseEvent: (ev) =>
            setSteps((prev) => applyPhaseStreamEvent(prev, ev)),
          onFinal: (raw) => {
            const ev = raw as ReportStreamEvent;
            if (ev.t !== "final") return;
            setMarkdown(ev.markdown);
            if (ev.preambleMarkdown !== undefined)
              setPreambleMarkdown(ev.preambleMarkdown);
            if (ev.tableRows !== undefined) setTableRows(ev.tableRows);
          },
          onStreamError: (message) => {
            pipelineError = message;
            setStreamError(message);
          },
        });
      } finally {
        setRunning(false);
        if (pipelineError === null && body.replayQueryOverrides !== undefined) {
          setLastAppliedFilterKey(JSON.stringify(body.replayQueryOverrides));
        }
        void loadMeta();
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
    const keys = reportTableColumnKeys(tableRows);
    const cols = keys.length > 0 ? keys : Object.keys(tableRows[0]!);
    const csv = tableRowsToCsv(tableRows, cols);
    const base = sanitizeDownloadBasename(meta.name);
    downloadTextFile(`${base}.csv`, csv, "text/csv;charset=utf-8");
  }, [tableRows, meta]);

  useEffect(() => {
    if (!meta || meta.id !== id || didAutoReplayRef.current) return;
    const canAutoReplay =
      meta.definition?.status === "ready" && !meta.staleDefinition;
    if (!canAutoReplay) return;
    didAutoReplayRef.current = true;
    void runStream({ regenerate: false });
  }, [meta, id, runStream]);

  const reportColumns = useMemo(() => {
    if (!tableRows?.length) return [];
    const keys = reportTableColumnKeys(tableRows);
    return buildReportDataColumns(
      keys.length > 0 ? keys : Object.keys(tableRows[0]!),
    );
  }, [tableRows]);

  const showDataTable = Boolean(
    tableRows && tableRows.length > 0 && reportColumns.length > 0,
  );
  const proseMarkdown = showDataTable
    ? (preambleMarkdown ?? "")
    : (markdown ?? "");

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
        Loading report…
      </div>
    );
  }

  /** Saved recipe (from user requirements) + rendered report (table and/or prose). */
  const showRecipeFilters =
    meta.recipe != null &&
    markdown != null &&
    (showDataTable || proseMarkdown.trim().length > 0);

  const canReplay =
    meta.definition?.status === "ready" && !meta.staleDefinition;
  const filtersDirty =
    canReplay &&
    filterApplyKey.length > 0 &&
    lastAppliedFilterKey !== null &&
    filterApplyKey !== lastAppliedFilterKey;
  const needsPrompt =
    !meta.definition ||
    meta.definition.status === "draft" ||
    meta.definition.status === "error" ||
    meta.staleDefinition;

  const canRunGenerate = Boolean(prompt.trim()) && !running;

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canRunGenerate) void runStream({ regenerate: true });
    }
  };

  const backHref = `/project/${meta.projectId}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-20">
      <InsightPageHeader
        backHref={backHref}
        title={meta.name}
        trackerName={meta.trackerName}
        projectName={meta.projectName}
        moduleName={meta.moduleName}
      />

      {meta.staleDefinition && <StaleDefinitionBanner variant="report" />}

      <InsightPromptCard
        label="What do you want to see?"
        labelHtmlFor="report-prompt"
        prompt={
          <InsightMultilinePrompt
            id="report-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder="e.g. Open tasks with title and due date, sorted by deadline; group spend by category (Shift+Enter for a new line)"
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
                Run saved recipe
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

      {markdown && (
        <div className="border-t border-border/40 pt-8 space-y-6">
          {showDataTable ? (
            <div className="flex justify-end">
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
          ) : null}
          {showRecipeFilters && meta.recipe ? (
            <div className="space-y-2">
              <ReportRecipeFilters
                defaultOpen
                userRequirementPrompt={meta.definition?.userPrompt}
                disabled={running || !canReplay}
                queryPlan={meta.recipe.queryPlan}
                formatterOnlyGroupBy={meta.recipe.formatterOnlyGroupBy}
                fieldCatalog={meta.fieldCatalog}
                rowTimeFilter={rowTimeFilter}
                onRowTimeFilterChange={setRowTimeFilter}
                filterRows={filterRows}
                onFilterRowsChange={setFilterRows}
                aggregateGroupBy={aggregateGroupBy}
                onAggregateGroupByChange={setAggregateGroupBy}
                onApply={handleApplyFilters}
                applyDisabled={running || !canReplay || !filtersDirty}
                applying={running}
                filtersDirty={filtersDirty}
                filterBaselineReady={lastAppliedFilterKey !== null}
              />
              {!canReplay &&
              meta.definition?.status === "ready" &&
              meta.staleDefinition ? (
                <p className="text-xs text-muted-foreground px-1">
                  Regenerate after a schema change to run again with these
                  filters.
                </p>
              ) : null}
            </div>
          ) : null}
          {proseMarkdown.trim().length > 0 && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{proseMarkdown}</Markdown>
            </div>
          )}
          {showDataTable && tableRows && (
            <div className="w-full min-w-0 rounded-sm overflow-hidden">
              <DataTable<Record<string, unknown>, unknown>
                columns={reportColumns}
                data={tableRows}
                addable={false}
                editable={false}
                deletable={false}
                editLayoutAble={false}
                showRowDetails={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
