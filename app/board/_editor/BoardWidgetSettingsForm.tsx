"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement, StatAggregate } from "@/lib/boards/board-definition";
import type { TrackerSchema } from "@/app/dashboard/dashboard-context";
import {
  fieldLabelFromAssembledSchema,
  layoutFieldIdsForGrid,
  type AssembledSchema,
} from "@/lib/boards/assembled-tracker-schema";

export function BoardWidgetSettingsForm({
  element,
  scopedTrackers,
  schema,
  onSchemaNeeded,
  onChange,
  onRemove,
  showRemoveButton = true,
}: {
  element: BoardElement;
  scopedTrackers: TrackerSchema[];
  schema: AssembledSchema | null;
  onSchemaNeeded: (trackerId: string) => void;
  onChange: (fn: (el: BoardElement) => BoardElement) => void;
  onRemove: () => void;
  showRemoveButton?: boolean;
}) {
  useEffect(() => {
    onSchemaNeeded(element.source.trackerSchemaId);
  }, [element.source.trackerSchemaId, onSchemaNeeded]);

  useEffect(() => {
    if (!schema?.grids?.length) return;
    if (schema.grids.some((g) => g.id === element.source.gridId)) return;
    const gid = schema.grids[0]!.id;
    const fids = layoutFieldIdsForGrid(schema, gid);
    onChange((el) => {
      const base = {
        trackerSchemaId: el.source.trackerSchemaId,
        gridId: gid,
        fieldIds: [] as string[],
      };
      if (el.type === "stat") {
        const fid = fids[0];
        const aggregate =
          fid && el.aggregate !== "count" ? el.aggregate : "count";
        return {
          ...el,
          source: { ...base, fieldIds: fid ? [fid] : [] },
          aggregate,
        };
      }
      if (el.type === "table") {
        return {
          ...el,
          source: { ...base, fieldIds: fids.slice(0, 5) },
        };
      }
      if (el.type === "chart") {
        const groupBy = fids[0] ?? "";
        return {
          ...el,
          source: {
            ...base,
            groupByFieldId: groupBy,
            metricFieldId: fids[1],
          },
        };
      }
      return el;
    });
  }, [schema, element.source.gridId, element.source.trackerSchemaId, onChange]);

  const grids = schema?.grids ?? [];
  const fieldIds = layoutFieldIdsForGrid(schema, element.source.gridId);

  return (
    <div className="flex max-h-[min(70vh,520px)] w-[min(100vw-2rem,20rem)] flex-col gap-3 overflow-y-auto p-3 sm:w-80">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Tracker</span>
        <Select
          value={element.source.trackerSchemaId}
          onValueChange={(tid) => {
            onSchemaNeeded(tid);
            onChange((el) => {
              const next = {
                ...el,
                source: { ...el.source, trackerSchemaId: tid },
              };
              return next as BoardElement;
            });
          }}
        >
          <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
            <SelectValue placeholder="Tracker" />
          </SelectTrigger>
          <SelectContent className={cn(theme.patterns.menuPanel)}>
            {scopedTrackers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name?.trim() || "Untitled tracker"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Grid</span>
        <Select
          value={element.source.gridId}
          onValueChange={(gid) =>
            onChange(
              (el) =>
                ({
                  ...el,
                  source: { ...el.source, gridId: gid, fieldIds: [] },
                }) as BoardElement,
            )
          }
        >
          <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
            <SelectValue placeholder="Grid" />
          </SelectTrigger>
          <SelectContent className={cn(theme.patterns.menuPanel)}>
            {grids.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {element.type === "stat" && (
        <>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Aggregate</span>
            <Select
              value={element.aggregate}
              onValueChange={(v) =>
                onChange((el) =>
                  el.type === "stat"
                    ? { ...el, aggregate: v as StatAggregate }
                    : el,
                )
              }
            >
              <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(theme.patterns.menuPanel)}>
                <SelectItem value="count">Count rows</SelectItem>
                <SelectItem value="sum">Sum field</SelectItem>
                <SelectItem value="avg">Average field</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {element.aggregate !== "count" && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Field</span>
              <Select
                value={element.source.fieldIds[0] ?? ""}
                onValueChange={(fid) =>
                  onChange((el) =>
                    el.type === "stat"
                      ? {
                          ...el,
                          source: { ...el.source, fieldIds: fid ? [fid] : [] },
                        }
                      : el,
                  )
                }
              >
                <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent className={cn(theme.patterns.menuPanel)}>
                  {fieldIds.map((fid) => (
                    <SelectItem key={fid} value={fid}>
                      {fieldLabelFromAssembledSchema(schema, fid)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {element.type === "table" && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Columns</span>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {fieldIds.map((fid) => {
              const checked = element.source.fieldIds.includes(fid);
              return (
                <label
                  key={fid}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      onChange((el) => {
                        if (el.type !== "table") return el;
                        const set = new Set(el.source.fieldIds);
                        if (on) set.add(fid);
                        else set.delete(fid);
                        return {
                          ...el,
                          source: {
                            ...el.source,
                            fieldIds: [...set],
                          },
                        };
                      });
                    }}
                  />
                  {fieldLabelFromAssembledSchema(schema, fid)}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {element.type === "chart" && (
        <>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Group by</span>
            <Select
              value={element.source.groupByFieldId}
              onValueChange={(fid) =>
                onChange((el) =>
                  el.type === "chart"
                    ? { ...el, source: { ...el.source, groupByFieldId: fid } }
                    : el,
                )
              }
            >
              <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(theme.patterns.menuPanel)}>
                {fieldIds.map((fid) => (
                  <SelectItem key={fid} value={fid}>
                    {fieldLabelFromAssembledSchema(schema, fid)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Metric (optional)
            </span>
            <Select
              value={element.source.metricFieldId ?? "__count__"}
              onValueChange={(v) =>
                onChange((el) =>
                  el.type === "chart"
                    ? {
                        ...el,
                        source: {
                          ...el.source,
                          metricFieldId: v === "__count__" ? undefined : v,
                        },
                      }
                    : el,
                )
              }
            >
              <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(theme.patterns.menuPanel)}>
                <SelectItem value="__count__">Count per group</SelectItem>
                {fieldIds
                  .filter((f) => f !== element.source.groupByFieldId)
                  .map((fid) => (
                    <SelectItem key={fid} value={fid}>
                      Sum {fieldLabelFromAssembledSchema(schema, fid)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Chart type</span>
            <Select
              value={element.chartKind}
              onValueChange={(v) =>
                onChange((el) =>
                  el.type === "chart"
                    ? { ...el, chartKind: v as "bar" | "line" }
                    : el,
                )
              }
            >
              <SelectTrigger className={cn("rounded-sm", theme.patterns.inputBase)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(theme.patterns.menuPanel)}>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <details
        className={cn(
          "rounded-sm border px-2 py-1.5",
          theme.uiChrome.border,
        )}
      >
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground marker:text-muted-foreground">
          Layout on grid
        </summary>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">X (0–11)</span>
            <Input
              type="number"
              min={0}
              max={11}
              className={cn("rounded-sm", theme.patterns.inputBase)}
              value={element.layout.x}
              onChange={(e) => {
                const x = Math.min(11, Math.max(0, Number(e.target.value) || 0));
                onChange((el) => ({ ...el, layout: { ...el.layout, x } }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Y</span>
            <Input
              type="number"
              min={0}
              className={cn("rounded-sm", theme.patterns.inputBase)}
              value={element.layout.y}
              onChange={(e) => {
                const y = Math.max(0, Number(e.target.value) || 0);
                onChange((el) => ({ ...el, layout: { ...el.layout, y } }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Width</span>
            <Input
              type="number"
              min={1}
              max={12}
              className={cn("rounded-sm", theme.patterns.inputBase)}
              value={element.layout.w}
              onChange={(e) => {
                const w = Math.min(12, Math.max(1, Number(e.target.value) || 1));
                onChange((el) => ({ ...el, layout: { ...el.layout, w } }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Height</span>
            <Input
              type="number"
              min={1}
              max={12}
              className={cn("rounded-sm", theme.patterns.inputBase)}
              value={element.layout.h}
              onChange={(e) => {
                const h = Math.min(12, Math.max(1, Number(e.target.value) || 1));
                onChange((el) => ({ ...el, layout: { ...el.layout, h } }));
              }}
            />
          </div>
        </div>
      </details>

      {showRemoveButton && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full rounded-sm"
          onClick={onRemove}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Remove block
        </Button>
      )}
    </div>
  );
}
