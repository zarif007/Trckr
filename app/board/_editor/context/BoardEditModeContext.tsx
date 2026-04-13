"use client";

import { createContext, useContext, useMemo } from "react";
import type { BoardDefinition } from "@/lib/boards/board-definition";

export interface BoardEditModeContextValue {
  editMode: boolean;
  definition: BoardDefinition | null;
  onDefinitionChange: ((def: BoardDefinition) => void) | undefined;
  undo?: () => void;
  canUndo?: boolean;
}

const BoardEditModeContext = createContext<BoardEditModeContextValue>({
  editMode: false,
  definition: null,
  onDefinitionChange: undefined,
  undo: undefined,
  canUndo: undefined,
});

export function BoardEditModeProvider({
  editMode,
  definition,
  onDefinitionChange,
  undo,
  canUndo,
  children,
}: BoardEditModeContextValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ editMode, definition, onDefinitionChange, undo, canUndo }),
    [editMode, definition, onDefinitionChange, undo, canUndo],
  );

  return (
    <BoardEditModeContext.Provider value={value}>
      {children}
    </BoardEditModeContext.Provider>
  );
}

export function useBoardEditMode() {
  return useContext(BoardEditModeContext);
}
