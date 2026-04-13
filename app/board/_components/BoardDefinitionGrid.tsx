"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import { buildRowsFromWidgets } from "@/lib/boards/grid-layout-utils";
import { BoardBlockViewCard } from "./BoardBlockViewCard";

export function BoardDefinitionGrid({
  elements,
  data,
  emptyMessage,
  className,
}: {
  elements: BoardElement[];
  data: Record<string, BoardElementPayload> | null;
  emptyMessage?: ReactNode;
  className?: string;
}) {
  const rows = useMemo(() => buildRowsFromWidgets(elements), [elements]);

  if (elements.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[40vh] items-center justify-center rounded-sm border border-dashed px-4 py-12 text-center text-sm text-muted-foreground",
          theme.uiChrome.border,
          className,
        )}
      >
        {emptyMessage ?? "No widgets yet."}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 pb-4 pt-1",
        className,
      )}
    >
      {rows.map((rowWidgets, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid min-w-0 grid-cols-12 gap-3"
        >
          {rowWidgets.map((el) => (
            <BoardBlockViewCard
              key={el.id}
              block={el}
              payload={data?.[el.id] ?? null}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
