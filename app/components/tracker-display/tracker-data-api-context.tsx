"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { RowBackedPersistLifecycle } from "@/lib/tracker-grid-rows";

export type TrackerDataApiContextValue = {
  trackerSchemaId: string | null | undefined;
  gridDataBranchName: string;
  rowBackedPersistLifecycle?: RowBackedPersistLifecycle | null;
};

const TrackerDataApiContext = createContext<TrackerDataApiContextValue>({
  trackerSchemaId: undefined,
  gridDataBranchName: "main",
  rowBackedPersistLifecycle: null,
});

export function TrackerDataApiProvider({
  trackerSchemaId,
  gridDataBranchName = "main",
  rowBackedPersistLifecycle,
  children,
}: {
  trackerSchemaId: string | null | undefined;
  gridDataBranchName?: string;
  rowBackedPersistLifecycle?: RowBackedPersistLifecycle | null;
  children: ReactNode;
}) {
  const value = useMemo(
    (): TrackerDataApiContextValue => ({
      trackerSchemaId,
      gridDataBranchName,
      rowBackedPersistLifecycle: rowBackedPersistLifecycle ?? null,
    }),
    [trackerSchemaId, gridDataBranchName, rowBackedPersistLifecycle],
  );
  return (
    <TrackerDataApiContext.Provider value={value}>
      {children}
    </TrackerDataApiContext.Provider>
  );
}

export function useTrackerDataApi(): TrackerDataApiContextValue {
  return useContext(TrackerDataApiContext);
}
