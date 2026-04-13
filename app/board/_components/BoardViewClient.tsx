"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { BoardDefinition } from "@/lib/boards/board-definition";
import type { BoardElementPayload } from "@/lib/boards/execute-board";
import { useBoardNavBar } from "../_hooks/useBoardNavBar";
import { BoardDefinitionGrid } from "./BoardDefinitionGrid";

type BoardMeta = {
  id: string;
  name: string;
  projectId: string;
  moduleId: string | null;
  definition: BoardDefinition;
  projectName: string | null;
  moduleName: string | null;
};

export function BoardViewClient({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [board, setBoard] = useState<BoardMeta | null>(null);
  const [data, setData] = useState<Record<string, BoardElementPayload> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [bRes, dRes] = await Promise.all([
        fetch(`/api/boards/${boardId}`),
        fetch(`/api/boards/${boardId}/data`),
      ]);
      if (bRes.status === 404) {
        router.replace("/dashboard");
        return;
      }
      if (!bRes.ok) throw new Error("Failed to load dashboard");
      const b = (await bRes.json()) as BoardMeta;
      setBoard(b);
      if (dRes.ok) {
        const dj = (await dRes.json()) as {
          elements: Record<string, BoardElementPayload>;
        };
        setData(dj.elements ?? {});
      } else {
        setData({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [boardId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useBoardNavBar({
    boardId,
    name: board?.name ?? "",
    mode: "view",
    enabled: Boolean(board),
  });

  if (loading && !board) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 pt-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex h-screen items-center justify-center p-6 pt-12 text-sm text-destructive">
        {error ?? "Not found"}
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background pt-12 text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5",
            "border-b",
            theme.uiChrome.border,
          )}
        >
          <div className="min-w-0 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{board.name}</span>
            {board.projectName ? (
              <span>
                {" "}
                · {board.projectName}
                {board.moduleName ? ` / ${board.moduleName}` : ""}
              </span>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-sm text-xs"
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <BoardDefinitionGrid
            elements={board.definition.elements}
            data={data}
            emptyMessage={
              <span>
                No widgets yet.{" "}
                <Link
                  href={`/board/${boardId}/edit`}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Add widgets in the editor
                </Link>
                .
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
