"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TrackerDataApiContextValue = {
  trackerSchemaId: string | null | undefined;
  gridDataBranchName: string;
};

const TrackerDataApiContext = createContext<TrackerDataApiContextValue>({
  trackerSchemaId: undefined,
  gridDataBranchName: "main",
});

export function TrackerDataApiProvider({
  trackerSchemaId,
  gridDataBranchName = "main",
  children,
}: {
  trackerSchemaId: string | null | undefined;
  gridDataBranchName?: string;
  children: ReactNode;
}) {
  return (
    <TrackerDataApiContext.Provider
      value={{ trackerSchemaId, gridDataBranchName }}
    >
      {children}
    </TrackerDataApiContext.Provider>
  );
}

export function useTrackerDataApi(): TrackerDataApiContextValue {
  return useContext(TrackerDataApiContext);
}
