"use client";

import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import type { QueryPlanV1 } from "@/lib/reports/ast-schemas";
import type { FilterRowDraft } from "@/app/report/lib/replay-overrides";
import { cn } from "@/lib/utils";

export type FieldCatalogEntry = {
  fieldId: string;
  label: string;
  gridId: string;
  gridName: string;
  dataType: string;
};

type RowTimePreset = NonNullable<
  NonNullable<QueryPlanV1["load"]["rowTimeFilter"]>["preset"]
>;

const TIME_PRESETS: { value: RowTimePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_month", label: "Last month (30d)" },
  { value: "last_calendar_month", label: "Last calendar month" },
];

const FILTER_OPS: { value: FilterRowDraft["op"]; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "in", label: "in (JSON array)" },
];

const META_PATH_SUGGESTIONS = [
  "__createdAt",
  "__updatedAt",
  "__label",
  "__gridId",
];

type ReportRecipeFiltersProps = {
  disabled: boolean;
  queryPlan: QueryPlanV1;
  formatterOnlyGroupBy: boolean;
  fieldCatalog: FieldCatalogEntry[];
  /** Original user request; filter defaults come from the recipe built from this. */
  userRequirementPrompt?: string | null;
  /** When true, the panel starts expanded (e.g. above the report output). */
  defaultOpen?: boolean;
  rowTimeFilter: QueryPlanV1["load"]["rowTimeFilter"] | null;
  onRowTimeFilterChange: (
    v: QueryPlanV1["load"]["rowTimeFilter"] | null,
  ) => void;
  filterRows: FilterRowDraft[];
  onFilterRowsChange: (rows: FilterRowDraft[]) => void;
  aggregateGroupBy: string[];
  onAggregateGroupByChange: (keys: string[]) => void;
  onApply: () => void;
  applyDisabled: boolean;
  applying: boolean;
  filtersDirty: boolean;
  /** After first successful replay / baseline sync; before this, Apply stays disabled. */
  filterBaselineReady: boolean;
};

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function ReportRecipeFilters({
  disabled,
  queryPlan,
  formatterOnlyGroupBy,
  fieldCatalog,
  userRequirementPrompt,
  defaultOpen = false,
  rowTimeFilter,
  onRowTimeFilterChange,
  filterRows,
  onFilterRowsChange,
  aggregateGroupBy,
  onAggregateGroupByChange,
  onApply,
  applyDisabled,
  applying,
  filtersDirty,
  filterBaselineReady,
}: ReportRecipeFiltersProps) {
  const dateEnabled = rowTimeFilter != null;
  const hasAggregate = Boolean(queryPlan.aggregate);

  const pathOptions = [
    ...META_PATH_SUGGESTIONS.map((id) => ({ id, label: id })),
    ...fieldCatalog.map((f) => ({
      id: f.fieldId,
      label: `${f.gridName}: ${f.label}`,
    })),
  ];

  const groupByOptions = fieldCatalog.map((f) => ({
    id: f.fieldId,
    label: `${f.gridName}: ${f.label}`,
  }));

  const setDateEnabled = (on: boolean) => {
    if (on) {
      onRowTimeFilterChange(
        rowTimeFilter ?? { field: "createdAt", preset: "last_30_days" },
      );
    } else {
      onRowTimeFilterChange(null);
    }
  };

  const requirement = userRequirementPrompt?.trim() ?? "";

  return (
    <details
      className="rounded-sm border border-border/50 bg-background overflow-hidden group"
      {...(defaultOpen ? { defaultOpen: true } : {})}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground/90 border-b border-border/40 bg-muted/15 hover:bg-muted/25 [&::-webkit-details-marker]:hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-t-md">
        <span>Report filters</span>
        <span className="text-xs font-normal text-muted-foreground sm:text-right">
          From your request — use Apply to update the report below
        </span>
      </summary>
      <div className="px-4 py-4 space-y-5 text-sm">
        {requirement ? (
          <div className="rounded-sm border border-border/40 bg-muted/15 px-3 py-2 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Your request
            </p>
            <p className="text-xs text-foreground/90 whitespace-pre-wrap">
              {requirement}
            </p>
          </div>
        ) : null}
        {formatterOnlyGroupBy ? (
          <p className="text-xs text-muted-foreground rounded-sm border border-border/40 bg-muted/20 px-3 py-2">
            This report groups data only in the formatter step. Change grouping
            with{" "}
            <strong className="font-medium text-foreground/80">
              Regenerate
            </strong>
            , or adjust filters below.
          </p>
        ) : null}

        <div className="rounded-sm border border-border/50 bg-muted/20 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <CalendarRange className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Row date range
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Only include tracker rows whose timestamp falls in this
                  window. Turn off to load all dates (subject to row limits).
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dateEnabled}
              aria-label={
                dateEnabled ? "Disable date filter" : "Enable date filter"
              }
              disabled={disabled}
              onClick={() => setDateEnabled(!dateEnabled)}
              className={cn(
                "flex h-7 w-12 shrink-0 items-center rounded-sm px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
                dateEnabled ? "bg-primary" : "bg-muted-foreground/25",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none h-5 w-5 rounded-full bg-background transition-[margin]",
                  dateEnabled ? "ml-auto" : "ml-0",
                )}
              />
            </button>
          </div>
          {dateEnabled && rowTimeFilter ? (
            <div className="rounded-sm border border-border/40 bg-background/90 p-3 sm:p-4 space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Configure range
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Timestamp field
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Which row time to compare
                  </p>
                  <Select
                    value={rowTimeFilter.field}
                    onValueChange={(field: "createdAt" | "updatedAt") =>
                      onRowTimeFilterChange({ ...rowTimeFilter, field })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger size="sm" className="w-full rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="createdAt">Created at</SelectItem>
                      <SelectItem value="updatedAt">Updated at</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Quick range
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Preset or refine below
                  </p>
                  <Select
                    value={rowTimeFilter.preset ?? "all"}
                    onValueChange={(v) => {
                      const preset = v as RowTimePreset;
                      onRowTimeFilterChange({
                        ...rowTimeFilter,
                        preset,
                        ...(preset === "all"
                          ? { from: undefined, to: undefined }
                          : {}),
                      });
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger size="sm" className="w-full rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm">
                      {TIME_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-foreground">
                    Custom start
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Optional; combines with preset when set
                  </p>
                  <Input
                    type="datetime-local"
                    value={
                      rowTimeFilter.from
                        ? isoToDatetimeLocal(rowTimeFilter.from)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      onRowTimeFilterChange({
                        ...rowTimeFilter,
                        from: v ? datetimeLocalToIso(v) : undefined,
                      });
                    }}
                    disabled={disabled}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-foreground">
                    Custom end
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Optional upper bound
                  </p>
                  <Input
                    type="datetime-local"
                    value={
                      rowTimeFilter.to
                        ? isoToDatetimeLocal(rowTimeFilter.to)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      onRowTimeFilterChange({
                        ...rowTimeFilter,
                        to: v ? datetimeLocalToIso(v) : undefined,
                      });
                    }}
                    disabled={disabled}
                    className="rounded-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {hasAggregate ? (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Group by
            </span>
            <MultiSelect
              options={groupByOptions}
              value={aggregateGroupBy}
              onChange={onAggregateGroupByChange}
              placeholder="Select fields…"
              disabled={disabled}
              className="w-full rounded-sm"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Row filters
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-sm"
              disabled={disabled}
              onClick={() =>
                onFilterRowsChange([
                  ...filterRows,
                  { path: "", op: "eq", valueRaw: "" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add filter
            </Button>
          </div>
          {filterRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No row filters.</p>
          ) : (
            <ul className="space-y-2">
              {filterRows.map((row, idx) => (
                <li
                  key={idx}
                  className={cn(
                    "grid gap-2 items-end sm:grid-cols-[1fr_minmax(0,7rem)_1fr_auto] p-2 rounded-sm border border-border/40 bg-muted/10",
                  )}
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Field
                    </span>
                    <Input
                      list={`report-filter-paths-${idx}`}
                      value={row.path}
                      onChange={(e) => {
                        const next = [...filterRows];
                        next[idx] = { ...row, path: e.target.value };
                        onFilterRowsChange(next);
                      }}
                      placeholder="field id or __meta"
                      disabled={disabled}
                      className="text-xs font-mono rounded-sm"
                    />
                    <datalist id={`report-filter-paths-${idx}`}>
                      {pathOptions.map((o) => (
                        <option key={o.id} value={o.id} label={o.label} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Op
                    </span>
                    <Select
                      value={row.op}
                      onValueChange={(op: FilterRowDraft["op"]) => {
                        const next = [...filterRows];
                        next[idx] = { ...row, op };
                        onFilterRowsChange(next);
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger size="sm" className="w-full rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-sm">
                        {FILTER_OPS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0 sm:col-span-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Value
                    </span>
                    <Input
                      value={row.valueRaw}
                      onChange={(e) => {
                        const next = [...filterRows];
                        next[idx] = { ...row, valueRaw: e.target.value };
                        onFilterRowsChange(next);
                      }}
                      placeholder="text, number, true/false, JSON…"
                      disabled={disabled}
                      className="text-xs rounded-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive rounded-sm"
                    disabled={disabled}
                    onClick={() =>
                      onFilterRowsChange(filterRows.filter((_, i) => i !== idx))
                    }
                    aria-label="Remove filter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2 border-t border-border/40 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground min-w-0">
            {filtersDirty ? (
              <span className="text-amber-800/90 dark:text-amber-200/90">
                You have filter changes that are not shown in the report yet.
              </span>
            ) : filterBaselineReady ? (
              <span>Report matches these filters.</span>
            ) : (
              <span>Preparing filter state…</span>
            )}
          </p>
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-2 self-start sm:self-auto rounded-sm"
            disabled={applyDisabled}
            onClick={onApply}
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Apply to report
          </Button>
        </div>
      </div>
    </details>
  );
}
