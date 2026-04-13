"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardElement } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import { BoardBlockHeader } from "@/app/board/_editor/BoardBlockHeader";
import { BoardBlockContent } from "@/app/board/_editor/BoardBlockContent";

export function BoardBlockViewCard({
  block,
  payload,
}: {
  block: BoardElement;
  payload: BoardElementPayload | null;
}) {
  const gridStyle = useMemo(
    (): React.CSSProperties => ({
      gridColumn: `span ${block.colSpan ?? 6}`,
      gridRow: `span ${block.rowSpan ?? 1}`,
    }),
    [block.colSpan, block.rowSpan],
  );

  return (
    <div style={gridStyle} className="min-h-0 min-w-0">
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-sm border bg-background",
          theme.radius.md,
          theme.uiChrome.border,
        )}
      >
        <BoardBlockHeader readOnly block={block} onUpdate={() => {}} />
        <BoardBlockContent
          readOnly
          block={block}
          payload={payload}
          onUpdate={() => {}}
        />
      </div>
    </div>
  );
}
