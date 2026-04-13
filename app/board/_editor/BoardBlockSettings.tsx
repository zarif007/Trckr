"use client";

import { useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement, StatAggregate } from "@/lib/boards/board-definition";
import type { AssembledSchema } from "@/lib/boards/assembled-tracker-schema";
import type { BoardBindingsContext } from "./board-editor-bindings";
import {
  fieldLabelFromAssembledSchema,
  layoutFieldIdsForGrid,
} from "@/lib/boards/assembled-tracker-schema";
import { snapBoardElementToSchema } from "@/lib/boards/snap-board-element-to-schema";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABLE_MAX_COLUMNS = 12;

export interface BoardBlockSettingsProps {
  block: BoardElement;
  onChange: (updater: (el: BoardElement) => BoardElement) => void;
  /** Required for stat, table, and chart blocks. */
  bindings?: BoardBindingsContext;
}

export function BoardBlockSettings({
  block,
  onChange,
  bindings,
}: BoardBlockSettingsProps) {
  const dataBlock =
    block.type === "text"
      ? null
      : (block as Extract<
          BoardElement,
          { type: "stat" | "table" | "chart" }
        >);

  useEffect(() => {
    if (!dataBlock) return;
    bindings?.onSchemaNeeded(dataBlock.source.trackerSchemaId);
  }, [dataBlock, bindings]);

  useEffect(() => {
    if (!dataBlock) return;
    const tid = dataBlock.source.trackerSchemaId;
    const snapSchema = bindings?.schemaByTracker[tid];
    if (!snapSchema?.grids?.length) return;
    const validGrid = snapSchema.grids.some(
      (g) => g.id === dataBlock.source.gridId,
    );
    if (validGrid) return;
    onChange((el) => snapBoardElementToSchema(el, snapSchema));
  }, [dataBlock, bindings, onChange]);

  const schema = useMemo(() => {
    if (!dataBlock || !bindings) return null;
    return bindings.schemaByTracker[dataBlock.source.trackerSchemaId] ?? null;
  }, [dataBlock, bindings]);

  const layoutFieldIds = useMemo(() => {
    if (!dataBlock || !schema) return [];
    return layoutFieldIdsForGrid(schema, dataBlock.source.gridId);
  }, [dataBlock, schema]);

  const setTracker = useCallback(
    (trackerSchemaId: string) => {
      if (block.type === "text" || !bindings) return;
      bindings.onSchemaNeeded(trackerSchemaId);
      const nextSchema = bindings.schemaByTracker[trackerSchemaId];
      onChange((el) => {
        if (el.type === "text") return el;
        if (!nextSchema?.grids?.length) {
          return {
            ...el,
            source: { ...el.source, trackerSchemaId },
          } as BoardElement;
        }
        return snapBoardElementToSchema(
          {
            ...el,
            source: { ...el.source, trackerSchemaId },
          } as BoardElement,
          nextSchema,
        );
      });
    },
    [block.type, onChange, bindings],
  );

  const setGrid = useCallback(
    (gridId: string) => {
      if (block.type === "text") return;
      if (!schema) return;
      onChange((el) => {
        if (el.type === "text") return el;
        const next = {
          ...el,
          source: { ...el.source, gridId },
        } as BoardElement;
        return snapBoardElementToSchema(next, schema);
      });
    },
    [block.type, onChange, schema],
  );

  if (block.type === "text") {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground">
          Text blocks have no data source. Edit content directly in the block.
        </p>
      </div>
    );
  }

  if (!bindings) {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground">
          Binding controls are unavailable.
        </p>
      </div>
    );
  }

  const scopedTrackers = bindings?.scopedTrackers ?? [];

  if (scopedTrackers.length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground">
          No trackers in this project scope. Add a tracker to configure widgets.
        </p>
      </div>
    );
  }

  const schemaLoading = !schema?.grids?.length;

  return (
    <div className="flex max-h-[min(70vh,560px)] w-[min(100vw-2rem,22rem)] flex-col gap-3 overflow-y-auto p-3 sm:w-96">
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Tracker</p>
        <Select
          value={block.source.trackerSchemaId}
          onValueChange={setTracker}
        >
          <SelectTrigger
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
            aria-label="Tracker"
          >
            <SelectValue placeholder="Select tracker" />
          </SelectTrigger>
          <SelectContent className={theme.patterns.floatingChrome}>
            {scopedTrackers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name?.trim() || t.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Grid</p>
        <Select
          value={block.source.gridId}
          onValueChange={setGrid}
          disabled={schemaLoading}
        >
          <SelectTrigger
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
            aria-label="Grid"
          >
            <SelectValue
              placeholder={schemaLoading ? "Loading…" : "Select grid"}
            />
          </SelectTrigger>
          <SelectContent className={theme.patterns.floatingChrome}>
            {(schema?.grids ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name?.trim() || g.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {block.type === "stat" ? (
        <StatFields
          block={block}
          schema={schema}
          layoutFieldIds={layoutFieldIds}
          onChange={onChange}
        />
      ) : null}

      {block.type === "table" ? (
        <TableFields
          block={block}
          schema={schema}
          layoutFieldIds={layoutFieldIds}
          onChange={onChange}
        />
      ) : null}

      {block.type === "chart" ? (
        <ChartFields block={block} schema={schema} onChange={onChange} />
      ) : null}

      <div
        className={cn(
          "mt-1 grid grid-cols-2 gap-2 border-t pt-3",
          theme.uiChrome.border,
        )}
      >
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            Width (cols)
          </p>
          <Input
            type="number"
            min={1}
            max={12}
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
            value={block.colSpan ?? 6}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange((el) => ({
                ...el,
                colSpan: Math.max(1, Math.min(12, Number.isFinite(n) ? n : 6)),
              }));
            }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            Height (rows)
          </p>
          <Input
            type="number"
            min={1}
            max={24}
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
            value={block.rowSpan ?? 1}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange((el) => ({
                ...el,
                rowSpan: Math.max(1, Math.min(24, Number.isFinite(n) ? n : 1)),
              }));
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatFields({
  block,
  schema,
  layoutFieldIds,
  onChange,
}: {
  block: Extract<BoardElement, { type: "stat" }>;
  schema: AssembledSchema | null;
  layoutFieldIds: string[];
  onChange: (updater: (el: BoardElement) => BoardElement) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          Aggregate
        </p>
        <Select
          value={block.aggregate}
          onValueChange={(v) => {
            const aggregate = v as StatAggregate;
            onChange((el) => {
              if (el.type !== "stat") return el;
              if (aggregate === "count") {
                return { ...el, aggregate, source: { ...el.source, fieldIds: [] } };
              }
              const first = layoutFieldIds[0];
              return {
                ...el,
                aggregate,
                source: {
                  ...el.source,
                  fieldIds: first ? [first] : [],
                },
              };
            });
          }}
        >
          <SelectTrigger
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
            aria-label="Aggregate"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={theme.patterns.floatingChrome}>
            <SelectItem value="count">Count rows</SelectItem>
            <SelectItem value="sum">Sum field</SelectItem>
            <SelectItem value="avg">Average field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {block.aggregate !== "count" ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Field</p>
          <Select
            value={block.source.fieldIds[0] ?? ""}
            onValueChange={(fieldId) => {
              onChange((el) => {
                if (el.type !== "stat") return el;
                return {
                  ...el,
                  source: { ...el.source, fieldIds: fieldId ? [fieldId] : [] },
                };
              });
            }}
            disabled={layoutFieldIds.length === 0}
          >
            <SelectTrigger
              className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
              aria-label="Numeric field"
            >
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent className={theme.patterns.floatingChrome}>
              {layoutFieldIds.map((fid) => (
                <SelectItem key={fid} value={fid}>
                  {fieldLabelFromAssembledSchema(schema, fid)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );
}

function TableFields({
  block,
  schema,
  layoutFieldIds,
  onChange,
}: {
  block: Extract<BoardElement, { type: "table" }>;
  schema: AssembledSchema | null;
  layoutFieldIds: string[];
  onChange: (updater: (el: BoardElement) => BoardElement) => void;
}) {
  const toggle = (fieldId: string, checked: boolean) => {
    onChange((el) => {
      if (el.type !== "table") return el;
      const set = new Set(el.source.fieldIds);
      if (checked) {
        if (set.size >= TABLE_MAX_COLUMNS) return el;
        set.add(fieldId);
      } else {
        set.delete(fieldId);
        if (set.size === 0) return el;
      }
      return { ...el, source: { ...el.source, fieldIds: [...set] } };
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground">
        Columns (max {TABLE_MAX_COLUMNS})
      </p>
      <div
        className={cn(
          "max-h-40 space-y-2 overflow-y-auto rounded-sm border p-2",
          theme.uiChrome.border,
        )}
      >
        {layoutFieldIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">No fields in this grid.</p>
        ) : (
          layoutFieldIds.map((fid) => (
            <label
              key={fid}
              className="flex cursor-pointer items-center gap-2 text-xs"
            >
              <Checkbox
                checked={block.source.fieldIds.includes(fid)}
                onCheckedChange={(v) => toggle(fid, v === true)}
              />
              <span>{fieldLabelFromAssembledSchema(schema, fid)}</span>
            </label>
          ))
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Max rows</p>
        <Input
          type="number"
          min={1}
          max={100}
          className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
          value={block.maxRows ?? 50}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange((el) => {
              if (el.type !== "table") return el;
              return {
                ...el,
                maxRows: Math.max(1, Math.min(100, Number.isFinite(n) ? n : 50)),
              };
            });
          }}
        />
      </div>
    </div>
  );
}

function ChartFields({
  block,
  schema,
  onChange,
}: {
  block: Extract<BoardElement, { type: "chart" }>;
  schema: AssembledSchema | null;
  onChange: (updater: (el: BoardElement) => BoardElement) => void;
}) {
  const layoutFieldIds = useMemo(
    () => layoutFieldIdsForGrid(schema, block.source.gridId),
    [schema, block.source.gridId],
  );

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          Category (group by)
        </p>
        <Select
          value={block.source.groupByFieldId}
          onValueChange={(groupByFieldId) => {
            onChange((el) => {
              if (el.type !== "chart") return el;
              const metric =
                el.source.metricFieldId === groupByFieldId
                  ? undefined
                  : el.source.metricFieldId;
              return {
                ...el,
                source: { ...el.source, groupByFieldId, metricFieldId: metric },
              };
            });
          }}
          disabled={layoutFieldIds.length === 0}
        >
          <SelectTrigger
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
          >
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent className={theme.patterns.floatingChrome}>
            {layoutFieldIds.map((fid) => (
              <SelectItem key={fid} value={fid}>
                {fieldLabelFromAssembledSchema(schema, fid)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          Value (optional)
        </p>
        <Select
          value={block.source.metricFieldId ?? "__count__"}
          onValueChange={(v) => {
            const metricFieldId = v === "__count__" ? undefined : v;
            onChange((el) => {
              if (el.type !== "chart") return el;
              return { ...el, source: { ...el.source, metricFieldId } };
            });
          }}
          disabled={layoutFieldIds.length === 0}
        >
          <SelectTrigger
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={theme.patterns.floatingChrome}>
            <SelectItem value="__count__">Count rows</SelectItem>
            {layoutFieldIds
              .filter((fid) => fid !== block.source.groupByFieldId)
              .map((fid) => (
                <SelectItem key={fid} value={fid}>
                  Sum · {fieldLabelFromAssembledSchema(schema, fid)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Chart type</p>
        <Select
          value={block.chartKind}
          onValueChange={(chartKind) => {
            onChange((el) => {
              if (el.type !== "chart") return el;
              if (chartKind !== "bar" && chartKind !== "line") return el;
              return { ...el, chartKind };
            });
          }}
        >
          <SelectTrigger
            className={cn("h-9 rounded-sm", theme.patterns.inputBase)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={theme.patterns.floatingChrome}>
            <SelectItem value="bar">Bar</SelectItem>
            <SelectItem value="line">Line</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
