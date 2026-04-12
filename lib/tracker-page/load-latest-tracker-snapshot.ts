import { listPaginatedGridSlugs } from "@/lib/grid-data-loading";
import type { TrackerGrid } from "@/app/components/tracker-display/types";
import type { TrackerResponse } from "@/app/tracker/hooks/useTrackerChat";
import type { TrackerPageRecord } from "./schema-with-tracker-name";

export type TrackerLatestSnapshot = {
  id: string;
  label: string | null;
  data: Record<string, Array<Record<string, unknown>>>;
  updatedAt?: string;
  formStatus?: string | null;
};

/**
 * Loads grid snapshot data using the same rules as the tracker page's
 * historical `getTrackerResource` helper. `fetchImpl` must resolve
 * `/api/trackers/...` paths (browser `fetch` or {@link fetchInternalApi}).
 */
export async function loadLatestTrackerSnapshot(
  fetchImpl: (path: string) => Promise<Response>,
  options: {
    trackerId: string;
    instanceId: string | null;
    tracker: TrackerPageRecord;
    schema: TrackerResponse;
  },
): Promise<TrackerLatestSnapshot | null> {
  const { trackerId, instanceId, tracker, schema } = options;

  const snapshot = await (async (): Promise<TrackerLatestSnapshot | null> => {
    if (instanceId && instanceId !== "new") {
      const res = await fetchImpl(`/api/trackers/${trackerId}/data/${instanceId}`);
      if (!res.ok) return null;
      const row = (await res.json()) as {
        id?: string;
        label?: string | null;
        data?: Record<string, Array<Record<string, unknown>>> | null;
        updatedAt?: string;
        formStatus?: string | null;
      };
      if (!row?.id || !row?.data) return null;
      return {
        id: row.id,
        label: row.label ?? null,
        data: row.data,
        updatedAt: row.updatedAt,
        formStatus: row.formStatus ?? null,
      };
    }
    if (tracker.instance === "MULTI" || instanceId === "new") return null;
    const paginatedSlugs = listPaginatedGridSlugs(
      (schema.grids ?? []) as TrackerGrid[],
    );
    const omitParam =
      paginatedSlugs.length > 0
        ? `?omitGridData=${encodeURIComponent(paginatedSlugs.join(","))}`
        : "";
    const res = await fetchImpl(`/api/trackers/${trackerId}/data${omitParam}`);
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      data?: Record<string, Array<Record<string, unknown>>>;
      total?: number;
    };
    if (!payload.data) return null;
    const gridKeys = Object.keys(payload.data);
    if (gridKeys.length === 0 && (payload.total ?? 0) === 0) return null;
    return {
      id: "current",
      label: null,
      data: payload.data,
    };
  })().catch(() => null);

  return snapshot;
}
