"use client";

import { useCallback, useRef, useState } from "react";

import type { BoardDefinition } from "./board-definition";
import { cloneBoardDefinition } from "./document-layout";

const DEFAULT_MAX_UNDO = 50;

/**
 * Board definition state with an undo stack. Mutations snapshot the **current**
 * definition via ref (not inside `setState`), so React Strict Mode does not
 * double-push history when the functional updater runs twice in development.
 */
export function useUndoableBoardDefinition(options?: { maxUndo?: number }) {
  const maxUndo = options?.maxUndo ?? DEFAULT_MAX_UNDO;
  const [definition, setDefinition] = useState<BoardDefinition | null>(null);
  const past = useRef<BoardDefinition[]>([]);
  const definitionRef = useRef<BoardDefinition | null>(null);
  definitionRef.current = definition;

  const [canUndo, setCanUndo] = useState(false);

  const mutateDefinition = useCallback(
    (fn: (prev: BoardDefinition) => BoardDefinition) => {
      const cur = definitionRef.current;
      if (!cur) return;
      past.current.push(cloneBoardDefinition(cur));
      if (past.current.length > maxUndo) {
        past.current.shift();
      }
      const next = fn(cur);
      definitionRef.current = next;
      setDefinition(next);
      setCanUndo(past.current.length > 0);
    },
    [maxUndo],
  );

  const undo = useCallback(() => {
    const snap = past.current.pop();
    setCanUndo(past.current.length > 0);
    if (snap) {
      definitionRef.current = snap;
      setDefinition(snap);
    }
  }, []);

  const replaceDefinition = useCallback(
    (next: BoardDefinition | null, opts?: { resetUndo?: boolean }) => {
      if (opts?.resetUndo) {
        past.current = [];
        setCanUndo(false);
      }
      definitionRef.current = next;
      setDefinition(next);
    },
    [],
  );

  return {
    definition,
    mutateDefinition,
    undo,
    canUndo,
    replaceDefinition,
  };
}
