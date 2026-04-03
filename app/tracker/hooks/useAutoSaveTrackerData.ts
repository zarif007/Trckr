import type { GridDataSnapshot } from "@/lib/tracker-data";
import {
  type AutoSaveState,
  type UseAutoSaveOptions,
  useAutoSave,
} from "@/app/hooks/useAutoSave";

export type { AutoSaveState, UseAutoSaveOptions };

export type UseAutoSaveTrackerDataOptions =
  UseAutoSaveOptions<GridDataSnapshot>;

export function useAutoSaveTrackerData(options: UseAutoSaveTrackerDataOptions) {
  return useAutoSave<GridDataSnapshot>(options);
}
