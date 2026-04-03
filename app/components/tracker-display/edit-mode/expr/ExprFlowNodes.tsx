"use client";

import { Handle, Position } from "reactflow";
import type { Node } from "reactflow";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Trash2,
  Database,
  Type,
  Plus,
  Minus,
  X,
  Divide,
  Calculator,
  CheckCircle2,
  Equal,
  Sigma,
  GitBranch,
  FunctionSquare,
  CaseSensitive,
  Copy,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FLOW_CONSTANTS,
  variadicHandleId,
  type ExprFlowNodeData,
} from "./expr-graph";
import { cn } from "@/lib/utils";
import type {
  AccumulateAction,
  AvailableField,
  ExprFlowOperator,
  LogicOp,
  MathOp,
  StringOp,
} from "./expr-types";

export type NodeUpdater = (
  id: string,
  partial: Partial<ExprFlowNodeData>,
) => void;

export interface FlowNodeData extends ExprFlowNodeData {
  onChange?: NodeUpdater;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  availableFields?: AvailableField[];
  resultFieldLabel?: string;
  resultFieldId?: string;
}

export type FlowNode = Node<FlowNodeData>;

export const OPERATOR_LABELS: Record<ExprFlowOperator, string> = {
  add: "Add",
  sub: "Subtract",
  mul: "Multiply",
  div: "Divide",
  eq: "Equals",
  neq: "Not equal",
  gt: "Greater than",
  gte: "Greater or equal",
  lt: "Less than",
  lte: "Less or equal",
};

export const OPERATOR_ICONS: Record<ExprFlowOperator, ReactNode> = {
  add: <Plus className="h-3.5 w-3.5" />,
  sub: <Minus className="h-3.5 w-3.5" />,
  mul: <X className="h-3.5 w-3.5" />,
  div: <Divide className="h-3.5 w-3.5" />,
  eq: <Equal className="h-3.5 w-3.5" />,
  neq: <span className="text-[10px] font-bold">≠</span>,
  gt: <span className="text-[10px] font-bold">&gt;</span>,
  gte: <span className="text-[10px] font-bold">≥</span>,
  lt: <span className="text-[10px] font-bold">&lt;</span>,
  lte: <span className="text-[10px] font-bold">≤</span>,
};

export const LOGIC_OP_LABELS: Record<LogicOp, string> = {
  if: "If / Then / Else",
  and: "AND",
  or: "OR",
  not: "NOT",
};

export const MATH_OP_LABELS: Record<MathOp, string> = {
  abs: "Absolute (|x|)",
  round: "Round",
  floor: "Floor",
  ceil: "Ceiling",
  mod: "Modulo (%)",
  pow: "Power (^)",
  min: "Minimum",
  max: "Maximum",
  clamp: "Clamp",
};

export const STRING_OP_LABELS: Record<StringOp, string> = {
  concat: "Concatenate",
  length: "Length",
  trim: "Trim",
  toUpper: "Uppercase",
  toLower: "Lowercase",
  slice: "Slice",
  includes: "Includes",
  regex: "Regex Match",
};

const NODE_STYLES = {
  field: {
    accent: "bg-blue-500",
    iconBg: "bg-blue-500/15",
    icon: <Database className="h-3.5 w-3.5 text-blue-600" />,
    label: "Field",
  },
  const: {
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-500/15",
    icon: <Type className="h-3.5 w-3.5 text-emerald-600" />,
    label: "Value",
  },
  op: {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <Calculator className="h-3.5 w-3.5 text-violet-600" />,
    label: "Operation",
  },
  result: {
    accent: "bg-amber-500",
    iconBg: "bg-amber-500/15",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />,
    label: "Result",
  },
  accumulator: {
    accent: "bg-cyan-500",
    iconBg: "bg-cyan-500/15",
    icon: <Sigma className="h-3.5 w-3.5 text-cyan-600" />,
    label: "Accumulator",
  },
  logic: {
    accent: "bg-indigo-500",
    iconBg: "bg-indigo-500/15",
    icon: <GitBranch className="h-3.5 w-3.5 text-indigo-600" />,
    label: "Logic",
  },
  math: {
    accent: "bg-orange-500",
    iconBg: "bg-orange-500/15",
    icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-600" />,
    label: "Math",
  },
  string: {
    accent: "bg-rose-500",
    iconBg: "bg-rose-500/15",
    icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-600" />,
    label: "String",
  },
} as const;

const ACCUMULATOR_ACTION_OPTIONS: { value: AccumulateAction; label: string }[] =
  [
    { value: "add", label: "Sum (+)" },
    { value: "sub", label: "Subtract (−)" },
    { value: "mul", label: "Multiply (×)" },
  ];

const NODE_BASE_CLASSES =
  "overflow-hidden rounded-sm border border-border/50 bg-background transition-all duration-150 hover:";
const NODE_HEADER_CLASSES =
  "flex items-center gap-2 px-2.5 py-2 text-xs font-semibold border-b border-border/25";
const NODE_BODY_CLASSES = "px-2.5 py-2";
const NODE_ICON_CLASSES =
  "h-[22px] w-[22px] rounded-sm flex items-center justify-center flex-shrink-0";
const NODE_DELETE_BUTTON_CLASSES =
  "nodrag inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors";
const HANDLE_CLASSES =
  "!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150";
const HANDLE_OFFSET_START = 46;
const HANDLE_OFFSET_STEP = 20;

const LOGIC_OP_HINTS: Record<LogicOp, string> = {
  if: "Connect a comparison (Equal, Greater than, etc.) to Condition; connect result values to Then and Else.",
  and: "All inputs must be true",
  or: "Any input must be true",
  not: "Negates the input",
};

type MathNodeShape = "unary" | "binary" | "variadic" | "ternary";
function getMathShape(op: MathOp): MathNodeShape {
  if (["abs", "round", "floor", "ceil"].includes(op)) return "unary";
  if (op === "mod" || op === "pow") return "binary";
  if (op === "min" || op === "max") return "variadic";
  return "ternary";
}

const MATH_TERNARY_LABELS: Record<string, [string, string, string]> = {
  clamp: ["Value", "Min", "Max"],
};

type StringNodeShape = "unary" | "binary" | "variadic" | "ternary" | "regex";
function getStringShape(op: StringOp): StringNodeShape {
  if (["length", "trim", "toUpper", "toLower"].includes(op)) return "unary";
  if (op === "includes") return "binary";
  if (op === "concat") return "variadic";
  if (op === "slice") return "ternary";
  return "regex";
}

function NodeContextMenu({
  id,
  data,
  canDelete = true,
}: {
  id: string;
  data: FlowNodeData;
  canDelete?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(NODE_DELETE_BUTTON_CLASSES, "ml-auto")}
          aria-label="Node options"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0" align="end">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              data.onDuplicate?.(id);
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Duplicate</span>
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                data.onDelete?.(id);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left border-t border-border/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FieldNode({ id, data }: { id: string; data: FlowNodeData }) {
  const value = data.fieldId ?? "";
  const options = data.availableFields ?? [];
  const selectedLabel = options.find((f) => f.fieldId === value)?.label;
  const style = NODE_STYLES.field;

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[200px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium text-xs flex-1 truncate">
          {style.label}
        </span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={NODE_BODY_CLASSES}>
        {selectedLabel && (
          <div className="mb-1.5 text-[11px] text-foreground/60 truncate">
            {selectedLabel}
          </div>
        )}
        <select
          className="w-full rounded-sm border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-foreground/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          value={value}
          onChange={(e) => data.onChange?.(id, { fieldId: e.target.value })}
        >
          <option value="">Select field...</option>
          {options.map((field) => (
            <option key={field.fieldId} value={field.fieldId}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-blue-500")}
      />
    </div>
  );
}

function ConstNode({ id, data }: { id: string; data: FlowNodeData }) {
  const style = NODE_STYLES.const;
  const value = data.value ?? "";

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[180px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium text-xs flex-1">
          {style.label}
        </span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={NODE_BODY_CLASSES}>
        {value && (
          <div className="mb-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-foreground/70 truncate font-mono">
            {value}
          </div>
        )}
        <Input
          value={value}
          onChange={(e) => data.onChange?.(id, { value: e.target.value })}
          className="h-8 border-border/60 bg-muted/30 text-xs text-foreground/80 focus:ring-2 focus:ring-emerald-500/30 rounded-sm"
          placeholder="Value"
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-emerald-500")}
      />
    </div>
  );
}

function OpNode({ id, data }: { id: string; data: FlowNodeData }) {
  const label = data.op ? OPERATOR_LABELS[data.op] : "Operator";
  const icon = data.op ? (
    OPERATOR_ICONS[data.op]
  ) : (
    <Calculator className="h-3.5 w-3.5" />
  );
  const style = NODE_STYLES.op;
  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[180px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>{icon}</span>
        <span className="text-foreground/80 font-medium">{label}</span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div
        className={cn(
          NODE_BODY_CLASSES,
          "flex items-center gap-3 text-[11px] text-muted-foreground",
        )}
      >
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-violet-400" />
          <span>Input A</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-violet-400" />
          <span>Input B</span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.INPUT_HANDLES[0]}
        style={{ top: HANDLE_OFFSET_START }}
        className={cn(HANDLE_CLASSES, "!border-violet-500")}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.INPUT_HANDLES[1]}
        style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP }}
        className={cn(HANDLE_CLASSES, "!border-violet-500")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-violet-500")}
      />
    </div>
  );
}

function ResultNode({ data }: { data: FlowNodeData }) {
  const style = NODE_STYLES.result;
  const name = data.resultFieldLabel;
  const id = data.resultFieldId;
  const bodyText =
    name && id
      ? `Value of ${name} (${id})`
      : name
        ? `Value of ${name}`
        : id
          ? `Value of ${id}`
          : "Final expression output";
  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[160px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium">{style.label}</span>
      </div>
      <div
        className={cn(NODE_BODY_CLASSES, "text-[11px] text-muted-foreground")}
      >
        {bodyText}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.RESULT_HANDLE_ID}
        className={cn(HANDLE_CLASSES, "!border-amber-500")}
      />
    </div>
  );
}

function AccumulatorNode({ id, data }: { id: string; data: FlowNodeData }) {
  const style = NODE_STYLES.accumulator;
  const kind = data.accumulatorKind ?? "accumulate";
  const isCount = kind === "count";
  const isSum = kind === "sum";
  const action = data.action ?? "add";
  const startIndex = data.startIndex;
  const endIndex = data.endIndex;
  const increment = data.increment ?? 1;
  const initialValue = data.initialValue;
  const headerLabel =
    kind === "count" ? "Count" : kind === "sum" ? "Sum" : style.label;

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[200px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium">{headerLabel}</span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={cn(NODE_BODY_CLASSES, "space-y-2")}>
        {!isCount && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground w-14 shrink-0">
              Action
            </label>
            {isSum ? (
              <span className="flex-1 text-xs text-muted-foreground">
                Sum (+)
              </span>
            ) : (
              <select
                className="flex-1 rounded-sm border border-border/60 bg-muted/30 px-2 py-1.5 text-xs"
                value={action}
                onChange={(e) =>
                  data.onChange?.(id, {
                    action: e.target.value as AccumulateAction,
                  })
                }
              >
                {ACCUMULATOR_ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {!isCount && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-14 shrink-0">
                Start
              </label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs"
                placeholder="0"
                value={startIndex === undefined ? "" : startIndex}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    data.onChange?.(id, { startIndex: undefined });
                    return;
                  }
                  const n = parseInt(v, 10);
                  data.onChange?.(id, {
                    startIndex: Number.isNaN(n) ? undefined : n,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-14 shrink-0">
                End
              </label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs"
                placeholder="To end"
                value={endIndex === undefined ? "" : endIndex}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    data.onChange?.(id, { endIndex: undefined });
                    return;
                  }
                  const n = parseInt(v, 10);
                  data.onChange?.(id, {
                    endIndex: Number.isNaN(n) ? undefined : n,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-14 shrink-0">
                Step
              </label>
              <select
                className="flex-1 rounded-sm border border-border/60 bg-muted/30 px-2 py-1.5 text-xs"
                value={increment}
                onChange={(e) =>
                  data.onChange?.(id, {
                    increment: parseInt(e.target.value, 10),
                  })
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    +{n}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {isSum && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground w-14 shrink-0">
              Initial
            </label>
            <Input
              type="number"
              className="h-8 text-xs"
              placeholder="0"
              value={initialValue === undefined ? "" : initialValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  data.onChange?.(id, { initialValue: undefined });
                  return;
                }
                const n = Number(v);
                data.onChange?.(id, {
                  initialValue: Number.isNaN(n) ? undefined : n,
                });
              }}
            />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          {isCount
            ? "Connect a Field (any column) to count rows."
            : "Connect a Field node (table column) to the left."}
        </p>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.ACCUMULATOR_SOURCE_HANDLE}
        style={{ top: 48 }}
        className={cn(HANDLE_CLASSES, "!border-cyan-500")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-cyan-500")}
      />
    </div>
  );
}

function LogicNode({ id, data }: { id: string; data: FlowNodeData }) {
  const style = NODE_STYLES.logic;
  const logicOp = data.logicOp ?? "and";
  const label = LOGIC_OP_LABELS[logicOp];
  const inputCount = data.inputCount ?? 2;
  const isVariadic = logicOp === "and" || logicOp === "or";
  const isIf = logicOp === "if";
  const isNot = logicOp === "not";

  return (
    <div className={cn(NODE_BASE_CLASSES, isIf ? "w-[240px]" : "w-[200px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium">{label}</span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={cn(NODE_BODY_CLASSES, "space-y-1.5")}>
        <p className="text-[10px] text-muted-foreground">
          {LOGIC_OP_HINTS[logicOp]}
        </p>
        {isIf && (
          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground/80">Condition</strong> —
                connect a comparison (Equal, &gt;, &lt;, …)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>
                <strong className="text-foreground/80">Then</strong> — value
                when true
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>
                <strong className="text-foreground/80">Else</strong> — value
                when false
              </span>
            </div>
          </div>
        )}
        {isVariadic && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {inputCount} inputs
            </span>
            <button
              type="button"
              className="nodrag ml-auto inline-flex h-5 w-5 items-center justify-center rounded-sm bg-indigo-500/20 text-indigo-600 hover:bg-indigo-500/30 transition-colors"
              onClick={() =>
                data.onChange?.(id, { inputCount: inputCount + 1 })
              }
              aria-label="Add input"
            >
              <Plus className="h-3 w-3" />
            </button>
            {inputCount > 2 && (
              <button
                type="button"
                className="nodrag inline-flex h-5 w-5 items-center justify-center rounded-sm bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 transition-colors"
                onClick={() =>
                  data.onChange?.(id, { inputCount: inputCount - 1 })
                }
                aria-label="Remove input"
              >
                <Minus className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
      {isNot && (
        <Handle
          type="target"
          position={Position.Left}
          id="a"
          style={{ top: HANDLE_OFFSET_START }}
          className={cn(HANDLE_CLASSES, "!border-indigo-500")}
        />
      )}
      {isIf && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.IF_HANDLES.cond}
            style={{ top: HANDLE_OFFSET_START }}
            className={cn(HANDLE_CLASSES, "!border-indigo-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.IF_HANDLES.then}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-indigo-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.IF_HANDLES.else}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP * 2 }}
            className={cn(HANDLE_CLASSES, "!border-indigo-500")}
          />
        </>
      )}
      {isVariadic &&
        Array.from({ length: inputCount }, (_, i) => (
          <Handle
            key={variadicHandleId(i)}
            type="target"
            position={Position.Left}
            id={variadicHandleId(i)}
            style={{ top: HANDLE_OFFSET_START + i * HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-indigo-500")}
          />
        ))}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-indigo-500")}
      />
    </div>
  );
}

function MathNode({ id, data }: { id: string; data: FlowNodeData }) {
  const style = NODE_STYLES.math;
  const mathOp = data.mathOp ?? "abs";
  const label = MATH_OP_LABELS[mathOp];
  const shape = getMathShape(mathOp);
  const inputCount = data.inputCount ?? 2;

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[200px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium">{label}</span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={cn(NODE_BODY_CLASSES, "space-y-1.5")}>
        {shape === "unary" && (
          <p className="text-[10px] text-muted-foreground">
            Single numeric input
          </p>
        )}
        {shape === "binary" && (
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              <span>{mathOp === "pow" ? "Base (A)" : "Dividend (A)"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              <span>{mathOp === "pow" ? "Exponent (B)" : "Divisor (B)"}</span>
            </div>
          </div>
        )}
        {shape === "ternary" && MATH_TERNARY_LABELS[mathOp] && (
          <div className="space-y-1 text-[10px] text-muted-foreground">
            {MATH_TERNARY_LABELS[mathOp].map((lbl) => (
              <div key={lbl} className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                <span>{lbl}</span>
              </div>
            ))}
          </div>
        )}
        {shape === "variadic" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {inputCount} inputs
            </span>
            <button
              type="button"
              className="nodrag ml-auto inline-flex h-5 w-5 items-center justify-center rounded-sm bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 transition-colors"
              onClick={() =>
                data.onChange?.(id, { inputCount: inputCount + 1 })
              }
              aria-label="Add input"
            >
              <Plus className="h-3 w-3" />
            </button>
            {inputCount > 2 && (
              <button
                type="button"
                className="nodrag inline-flex h-5 w-5 items-center justify-center rounded-sm bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 transition-colors"
                onClick={() =>
                  data.onChange?.(id, { inputCount: inputCount - 1 })
                }
                aria-label="Remove input"
              >
                <Minus className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
      {shape === "unary" && (
        <Handle
          type="target"
          position={Position.Left}
          id="a"
          style={{ top: HANDLE_OFFSET_START }}
          className={cn(HANDLE_CLASSES, "!border-orange-500")}
        />
      )}
      {shape === "binary" && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.INPUT_HANDLES[0]}
            style={{ top: HANDLE_OFFSET_START }}
            className={cn(HANDLE_CLASSES, "!border-orange-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.INPUT_HANDLES[1]}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-orange-500")}
          />
        </>
      )}
      {shape === "ternary" && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.CLAMP_HANDLES.value}
            style={{ top: HANDLE_OFFSET_START }}
            className={cn(HANDLE_CLASSES, "!border-orange-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.CLAMP_HANDLES.min}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-orange-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.CLAMP_HANDLES.max}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP * 2 }}
            className={cn(HANDLE_CLASSES, "!border-orange-500")}
          />
        </>
      )}
      {shape === "variadic" &&
        Array.from({ length: inputCount }, (_, i) => (
          <Handle
            key={variadicHandleId(i)}
            type="target"
            position={Position.Left}
            id={variadicHandleId(i)}
            style={{ top: HANDLE_OFFSET_START + i * HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-orange-500")}
          />
        ))}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-orange-500")}
      />
    </div>
  );
}

function StringNode({ id, data }: { id: string; data: FlowNodeData }) {
  const style = NODE_STYLES.string;
  const stringOp = data.stringOp ?? "concat";
  const label = STRING_OP_LABELS[stringOp];
  const shape = getStringShape(stringOp);
  const inputCount = data.inputCount ?? 2;

  return (
    <div className={cn(NODE_BASE_CLASSES, "w-[210px]")}>
      <div className={cn("h-[3px] w-full", style.accent)} />
      <div className={NODE_HEADER_CLASSES}>
        <span className={cn(NODE_ICON_CLASSES, style.iconBg)}>
          {style.icon}
        </span>
        <span className="text-foreground/80 font-medium">{label}</span>
        <NodeContextMenu id={id} data={data} />
      </div>
      <div className={cn(NODE_BODY_CLASSES, "space-y-1.5")}>
        {shape === "unary" && (
          <p className="text-[10px] text-muted-foreground">
            Single string input
          </p>
        )}
        {shape === "binary" && (
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>Haystack (A)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>Needle (B)</span>
            </div>
          </div>
        )}
        {shape === "ternary" && (
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>String (top)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>Start index</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>End index</span>
            </div>
          </div>
        )}
        {shape === "variadic" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">
              {inputCount} parts
            </span>
            <button
              type="button"
              className="nodrag ml-auto inline-flex h-5 w-5 items-center justify-center rounded-sm bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 transition-colors"
              onClick={() =>
                data.onChange?.(id, { inputCount: inputCount + 1 })
              }
              aria-label="Add input"
            >
              <Plus className="h-3 w-3" />
            </button>
            {inputCount > 2 && (
              <button
                type="button"
                className="nodrag inline-flex h-5 w-5 items-center justify-center rounded-sm bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 transition-colors"
                onClick={() =>
                  data.onChange?.(id, { inputCount: inputCount - 1 })
                }
                aria-label="Remove input"
              >
                <Minus className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        {shape === "regex" && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>String input (left)</span>
            </div>
            <Input
              value={data.pattern ?? ""}
              onChange={(e) => data.onChange?.(id, { pattern: e.target.value })}
              className="h-7 border-border/60 bg-muted/30 text-xs focus:ring-1 focus:ring-rose-500/30"
              placeholder="Pattern (e.g. ^\d+$)"
            />
            <Input
              value={data.flags ?? ""}
              onChange={(e) => data.onChange?.(id, { flags: e.target.value })}
              className="h-7 border-border/60 bg-muted/30 text-xs focus:ring-1 focus:ring-rose-500/30"
              placeholder="Flags (e.g. i, g)"
            />
          </div>
        )}
      </div>
      {shape === "unary" && (
        <Handle
          type="target"
          position={Position.Left}
          id="a"
          style={{ top: HANDLE_OFFSET_START }}
          className={cn(HANDLE_CLASSES, "!border-rose-500")}
        />
      )}
      {shape === "binary" && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.INPUT_HANDLES[0]}
            style={{ top: HANDLE_OFFSET_START }}
            className={cn(HANDLE_CLASSES, "!border-rose-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.INPUT_HANDLES[1]}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-rose-500")}
          />
        </>
      )}
      {shape === "ternary" && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.SLICE_HANDLES.value}
            style={{ top: HANDLE_OFFSET_START }}
            className={cn(HANDLE_CLASSES, "!border-rose-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.SLICE_HANDLES.start}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-rose-500")}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={FLOW_CONSTANTS.SLICE_HANDLES.end}
            style={{ top: HANDLE_OFFSET_START + HANDLE_OFFSET_STEP * 2 }}
            className={cn(HANDLE_CLASSES, "!border-rose-500")}
          />
        </>
      )}
      {shape === "variadic" &&
        Array.from({ length: inputCount }, (_, i) => (
          <Handle
            key={variadicHandleId(i)}
            type="target"
            position={Position.Left}
            id={variadicHandleId(i)}
            style={{ top: HANDLE_OFFSET_START + i * HANDLE_OFFSET_STEP }}
            className={cn(HANDLE_CLASSES, "!border-rose-500")}
          />
        ))}
      {shape === "regex" && (
        <Handle
          type="target"
          position={Position.Left}
          id="a"
          style={{ top: HANDLE_OFFSET_START }}
          className={cn(HANDLE_CLASSES, "!border-rose-500")}
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className={cn(HANDLE_CLASSES, "!border-rose-500")}
      />
    </div>
  );
}

export const nodeTypes = {
  field: FieldNode,
  const: ConstNode,
  op: OpNode,
  result: ResultNode,
  accumulator: AccumulatorNode,
  logic: LogicNode,
  math: MathNode,
  string: StringNode,
} as const;
