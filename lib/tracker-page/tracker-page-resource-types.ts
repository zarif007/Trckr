import type { TrackerResponse } from "@/app/tracker/hooks/useTrackerChat";
import type { TrackerLatestSnapshot } from "./load-latest-tracker-snapshot";
import type { TrackerPageRecord } from "./schema-with-tracker-name";

export type TrackerDataPageResource = {
  tracker: TrackerPageRecord;
  schema: TrackerResponse;
  latestSnapshot: TrackerLatestSnapshot | null;
};

export type TrackerEditPageResource = {
  tracker: TrackerPageRecord;
  schema: TrackerResponse;
};
