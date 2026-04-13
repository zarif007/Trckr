"use client";

import type { BoardElement, TextElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { BoardBlockChart } from "./BoardBlockChart";
import { BoardBlockTextEditor } from "./BoardBlockTextEditor";

export interface BoardBlockContentProps {
  block: BoardElement;
  payload: BoardElementPayload | null;
  onUpdate: (updater: (el: BoardElement) => BoardElement) => void;
  /** View / preview: text from definition only; no inline editors. */
  readOnly?: boolean;
}

export function BoardBlockContent({
  block,
  payload,
  onUpdate,
  readOnly = false,
}: BoardBlockContentProps) {
  if (block.type === "text") {
    if (readOnly) {
      const text = (block as TextElement).content?.trim() ?? "";
      return (
        <div className="min-h-0 flex-1 px-2 pb-3 pt-1 sm:px-3">
          {text.length > 0 ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {text}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No text.</p>
          )}
        </div>
      );
    }
    return (
      <div className="px-2 pb-3 pt-1 sm:px-3">
        <BoardBlockTextEditor
          block={block}
          onUpdate={onUpdate as unknown as (updater: (el: TextElement) => TextElement) => void}
        />
      </div>
    );
  }

  return (
    <div className="px-2 pb-3 pt-1 sm:px-3">
      {renderPayload(block, payload)}
    </div>
  );
}

function renderPayload(
  block: BoardElement,
  payload: BoardElementPayload | null,
) {
  if (!payload) {
    return <p className="text-xs text-muted-foreground">No data yet.</p>;
  }

  if (payload.error) {
    return <p className="text-xs text-destructive">{payload.error}</p>;
  }

  if (payload.kind === "stat") {
    const v = payload.value;
    return (
      <div>
        <p className="text-2xl font-semibold tabular-nums leading-tight">
          {v == null ? "—" : formatStat(v)}
        </p>
        {payload.truncated && (
          <p className="mt-1 text-[10px] font-normal text-muted-foreground">
            Partial data (row cap)
          </p>
        )}
      </div>
    );
  }

  if (payload.kind === "table") {
    if (payload.columns.length === 0) {
      return (
        <p className="text-xs text-muted-foreground">Configure columns.</p>
      );
    }

    return (
      <div className="max-h-56 overflow-auto text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {payload.columns.map((c) => (
                <th
                  key={c.fieldId}
                  className={cn(
                    "border-b p-1.5 text-left font-medium",
                    theme.uiChrome.border,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row, ri) => (
              <tr key={ri}>
                {payload.columns.map((c) => (
                  <td
                    key={c.fieldId}
                    className={cn(
                      "border-b p-1.5 align-top",
                      theme.uiChrome.border,
                    )}
                  >
                    {formatCell(row[c.fieldId])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (payload.kind === "chart") {
    const chartData = payload.points.map((p) => ({
      name: p.label,
      value: p.value,
    }));

    return (
      <BoardBlockChart
        kind={payload.chartKind === "line" ? "line" : "bar"}
        data={chartData}
        truncated={payload.truncated}
      />
    );
  }

  return null;
}

function formatStat(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function formatCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
