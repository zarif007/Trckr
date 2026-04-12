import "server-only";

import { fetchInternalApi } from "@/lib/http/fetch-internal-api";
import { loadLatestTrackerSnapshot } from "./load-latest-tracker-snapshot";
import { schemaWithTrackerName, type TrackerPageRecord } from "./schema-with-tracker-name";
import type {
  TrackerDataPageResource,
  TrackerEditPageResource,
} from "./tracker-page-resource-types";

export async function loadTrackerDataPageResource(
  id: string,
  instanceId: string | null,
): Promise<TrackerDataPageResource> {
  const fetchImpl = (path: string) => fetchInternalApi(path);
  const res = await fetchImpl(`/api/trackers/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error("FAILED");
  }
  const data = (await res.json()) as TrackerPageRecord;
  const schema = schemaWithTrackerName(data);
  const latestSnapshot = await loadLatestTrackerSnapshot(fetchImpl, {
    trackerId: id,
    instanceId,
    tracker: data,
    schema,
  });
  return { tracker: data, schema, latestSnapshot };
}

export async function loadTrackerEditPageResource(
  id: string,
): Promise<TrackerEditPageResource> {
  const res = await fetchInternalApi(`/api/trackers/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error("FAILED");
  }
  const data = (await res.json()) as TrackerPageRecord;
  return { tracker: data, schema: schemaWithTrackerName(data) };
}
