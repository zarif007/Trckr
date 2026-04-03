/**
 * Inline config editors for each dynamic function node kind.
 */

"use client";

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DynamicConnectorDef, DynamicFunctionNodeKind, DynamicValueSelector } from "@/lib/dynamic-options";
import type { AvailableField } from "../expr/expr-types";
import type { ExprNode } from "@/lib/functions/types";
import { normalizeExprNode } from "@/lib/schemas/expr";
import { cn } from "@/lib/utils";

const DEFAULT_FILTER_EXPR: ExprNode = { op: "const", value: true };

type SelectorType = "path" | "const" | "fromArg" | "fromContext";

export function getSelectorTypeAndValue(sel: DynamicValueSelector | undefined): {
  type: SelectorType;
  value: string;
} {
  if (sel == null) return { type: "path", value: "" };
  if (typeof sel === "string") return { type: "path", value: sel };
  if ("const" in sel)
    return { type: "const", value: JSON.stringify(sel.const) };
  if ("fromArg" in sel) return { type: "fromArg", value: String(sel.fromArg) };
  if ("fromContext" in sel)
    return { type: "fromContext", value: String(sel.fromContext) };
  return { type: "path", value: "" };
}

export function selectorFromTypeAndValue(
  type: SelectorType,
  value: string,
): DynamicValueSelector {
  if (type === "path") return value;
  if (type === "const") {
    try {
      return { const: JSON.parse(value || "null") };
    } catch {
      return { const: value };
    }
  }
  if (type === "fromArg") return { fromArg: value };
  if (type === "fromContext") return { fromContext: value };
  return value;
}

interface DynamicNodeCardInlineConfigProps {
  nodeId: string;
  kind: DynamicFunctionNodeKind;
  config: Record<string, unknown>;
  onConfigChange: (
    nodeId: string,
    updater: (c: Record<string, unknown>) => Record<string, unknown>,
  ) => void;
  grids: Array<{ id: string; name: string }>;
  connectors: Record<string, DynamicConnectorDef>;
  availableFields: AvailableField[];
  onOpenFilterExpr: (nodeId: string, expr: ExprNode) => void;
}

const INPUT_CLASS = "h-7 text-xs";

export function DynamicNodeCardInlineConfig({
  nodeId,
  kind,
  config,
  onConfigChange,
  grids,
  connectors,
  onOpenFilterExpr,
}: DynamicNodeCardInlineConfigProps) {
  const update = useCallback(
    (updater: (c: Record<string, unknown>) => Record<string, unknown>) =>
      onConfigChange(nodeId, updater),
    [nodeId, onConfigChange],
  );

  if (kind === "source.grid_rows") {
    return (
      <Select
        value={String(config.gridId ?? "")}
        onValueChange={(v) => update((c) => ({ ...c, gridId: v }))}
      >
        <SelectTrigger className={INPUT_CLASS}>
          <SelectValue placeholder="Grid" />
        </SelectTrigger>
        <SelectContent>
          {grids.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (kind === "source.current_context") {
    return (
      <div className="space-y-1 flex flex-col">
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.includeRowValues !== false}
            onCheckedChange={(v) =>
              update((c) => ({ ...c, includeRowValues: Boolean(v) }))
            }
          />
          Row values
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.includeFieldMetadata !== false}
            onCheckedChange={(v) =>
              update((c) => ({ ...c, includeFieldMetadata: Boolean(v) }))
            }
          />
          Field metadata
        </label>
      </div>
    );
  }

  if (kind === "source.layout_fields") {
    return (
      <div className="space-y-1 flex flex-col">
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.includeHidden === true}
            onCheckedChange={(v) =>
              update((c) => ({ ...c, includeHidden: Boolean(v) }))
            }
          />
          Include hidden
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.excludeSharedTab !== false}
            onCheckedChange={(v) =>
              update((c) => ({ ...c, excludeSharedTab: Boolean(v) }))
            }
          />
          Exclude Master Data tab
        </label>
      </div>
    );
  }

  if (kind === "source.http_get") {
    return (
      <div className="space-y-1.5">
        <Select
          value={String(config.connectorId ?? "")}
          onValueChange={(v) => update((c) => ({ ...c, connectorId: v }))}
        >
          <SelectTrigger className={INPUT_CLASS}>
            <SelectValue placeholder="Connector" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(connectors).map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={String(config.path ?? "")}
          onChange={(e) => update((c) => ({ ...c, path: e.target.value }))}
          placeholder="/path"
          className={INPUT_CLASS}
        />
      </div>
    );
  }

  if (kind === "transform.filter") {
    const hasExpr = config.expr != null && typeof config.expr === "object";
    return (
      <div className="space-y-1.5">
        {hasExpr ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() =>
              onOpenFilterExpr(
                nodeId,
                normalizeExprNode(
                  (config.expr as ExprNode) ?? DEFAULT_FILTER_EXPR,
                ),
              )
            }
          >
            Edit expression
          </Button>
        ) : (
          <>
            <Input
              value={String(
                (Array.isArray(config.predicates) &&
                  (config.predicates[0] as Record<string, unknown>)?.field) ??
                  "",
              )}
              onChange={(e) =>
                update((c) => {
                  const preds = Array.isArray(c.predicates)
                    ? [...c.predicates]
                    : [{ field: "", op: "eq", value: "" }];
                  const first = (preds[0] as Record<string, unknown>) ?? {};
                  preds[0] = { ...first, field: e.target.value };
                  return { ...c, predicates: preds };
                })
              }
              placeholder="Field"
              className={INPUT_CLASS}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onOpenFilterExpr(nodeId, DEFAULT_FILTER_EXPR)}
            >
              Use expression
            </Button>
          </>
        )}
      </div>
    );
  }

  if (kind === "transform.map_fields") {
    const mappings =
      (config.mappings as Record<string, DynamicValueSelector>) ?? {};
    return (
      <div className="space-y-1.5">
        {Object.entries(mappings).map(([key, sel]) => {
          const { type, value } = getSelectorTypeAndValue(sel);
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-1 rounded-sm border border-border/60 bg-muted/20 p-1.5"
            >
              <Input
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  if (!newKey) return;
                  const next = { ...mappings };
                  delete next[key];
                  next[newKey] = selectorFromTypeAndValue(type, value);
                  update((c) => ({ ...c, mappings: next }));
                }}
                placeholder="key"
                className={cn(INPUT_CLASS, "flex-1 min-w-0")}
              />
              <Select
                value={type}
                onValueChange={(nextType) => {
                  const next = { ...mappings };
                  next[key] = selectorFromTypeAndValue(
                    nextType as SelectorType,
                    value,
                  );
                  update((c) => ({ ...c, mappings: next }));
                }}
              >
                <SelectTrigger className={cn(INPUT_CLASS, "w-[90px]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="path">Path</SelectItem>
                  <SelectItem value="const">Const</SelectItem>
                  <SelectItem value="fromArg">Arg</SelectItem>
                  <SelectItem value="fromContext">Ctx</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={value}
                onChange={(e) => {
                  const next = { ...mappings };
                  next[key] = selectorFromTypeAndValue(type, e.target.value);
                  update((c) => ({ ...c, mappings: next }));
                }}
                placeholder={
                  type === "path" ? "path" : type === "const" ? "value" : "key"
                }
                className={cn(INPUT_CLASS, "flex-1 min-w-0")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  const next = { ...mappings };
                  delete next[key];
                  update((c) => ({ ...c, mappings: next }));
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => {
            const next = { ...mappings };
            let name = "field";
            let i = 0;
            while (next[name] !== undefined) name = `field_${++i}`;
            next[name] = "";
            update((c) => ({ ...c, mappings: next }));
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add mapping
        </Button>
      </div>
    );
  }

  if (kind === "transform.unique" || kind === "transform.sort") {
    return (
      <Input
        value={String(config.by ?? "")}
        onChange={(e) => update((c) => ({ ...c, by: e.target.value }))}
        placeholder="Field path"
        className={INPUT_CLASS}
      />
    );
  }

  if (kind === "transform.limit") {
    return (
      <Input
        type="number"
        value={String(config.count ?? 100)}
        onChange={(e) =>
          update((c) => ({ ...c, count: Number(e.target.value) || 0 }))
        }
        className={INPUT_CLASS}
      />
    );
  }

  if (kind === "transform.flatten_path") {
    return (
      <Input
        value={String(config.path ?? "")}
        onChange={(e) => update((c) => ({ ...c, path: e.target.value }))}
        placeholder="Path"
        className={INPUT_CLASS}
      />
    );
  }

  if (kind === "ai.extract_options") {
    return (
      <div className="space-y-1.5">
        <Input
          value={String(config.prompt ?? "")}
          onChange={(e) => update((c) => ({ ...c, prompt: e.target.value }))}
          placeholder="Prompt"
          className={INPUT_CLASS}
        />
        <Input
          type="number"
          value={String(config.maxRows ?? 200)}
          onChange={(e) =>
            update((c) => ({ ...c, maxRows: Number(e.target.value) || 200 }))
          }
          className={INPUT_CLASS}
        />
      </div>
    );
  }

  if (kind === "output.options") {
    const m = (config.mapping as Record<string, unknown>) ?? {};
    return (
      <div className="space-y-1">
        <Input
          value={String(m.label ?? "")}
          onChange={(e) =>
            update((c) => ({
              ...c,
              mapping: {
                ...(c.mapping as Record<string, unknown>),
                label: e.target.value,
              },
            }))
          }
          placeholder="Label"
          className={INPUT_CLASS}
        />
        <Input
          value={String(m.value ?? "")}
          onChange={(e) =>
            update((c) => ({
              ...c,
              mapping: {
                ...(c.mapping as Record<string, unknown>),
                value: e.target.value,
              },
            }))
          }
          placeholder="Value"
          className={INPUT_CLASS}
        />
      </div>
    );
  }

  return null;
}
