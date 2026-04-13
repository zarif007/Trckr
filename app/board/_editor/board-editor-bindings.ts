import type { TrackerSchema } from "@/app/dashboard/dashboard-context";
import type { AssembledSchema } from "@/lib/boards/assembled-tracker-schema";

/** Threaded into widget settings for tracker/grid/field pickers. */
export type BoardBindingsContext = {
  scopedTrackers: TrackerSchema[];
  schemaByTracker: Record<string, AssembledSchema | null>;
  onSchemaNeeded: (trackerSchemaId: string) => void;
};
