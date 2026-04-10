/**
 * HTTP + JSON parsing for “foreign” trackers referenced by bindings (optionsSourceSchemaId).
 * Keeps fetch URLs and response shapes in one place for contributors.
 */

import type { ForeignBindingSourceSchema } from "@/lib/dynamic-options";
import type {
  ForeignDataPersistMeta,
  ForeignSourceBundle,
  GridDataSnapshot,
} from "./types";

const trackerUrl = (schemaId: string) =>
  `/api/trackers/${encodeURIComponent(schemaId)}`;
const trackerDataListUrl = (
  schemaId: string,
  options?: { preview?: boolean; branchName?: string },
) => {
  const url = `/api/trackers/${encodeURIComponent(schemaId)}/data`;
  const params = new URLSearchParams();
  params.set("branch", options?.branchName ?? "main");
  if (options?.preview) {
    params.set("preview", "true");
    params.set("limit", "7");
  }
  return `${url}?${params.toString()}`;
};
/** POST/PATCH target (no query string). */
const trackerDataWriteUrl = (schemaId: string) =>
  `/api/trackers/${encodeURIComponent(schemaId)}/data`;
const trackerDataItemUrl = (schemaId: string, dataId: string) =>
  `/api/trackers/${encodeURIComponent(schemaId)}/data/${encodeURIComponent(dataId)}`;

type DataPayload = {
  data?: GridDataSnapshot;
  total?: number;
};

function parseDataPayload(json: unknown): DataPayload {
  return json && typeof json === "object" ? (json as DataPayload) : {};
}

/** Extract grids / fields / layoutNodes from GET /api/trackers/:id JSON. */
export function parseSchemaSliceFromTrackerJson(
  tracker: unknown,
): ForeignBindingSourceSchema | null {
  if (!tracker || typeof tracker !== "object") return null;
  const schema = (tracker as { schema?: unknown }).schema;
  if (!schema || typeof schema !== "object" || schema === null) return null;
  const s = schema as {
    grids?: ForeignBindingSourceSchema["grids"];
    fields?: ForeignBindingSourceSchema["fields"];
    layoutNodes?: ForeignBindingSourceSchema["layoutNodes"];
  };
  return {
    grids: Array.isArray(s.grids) ? s.grids : [],
    fields: Array.isArray(s.fields) ? s.fields : [],
    layoutNodes: Array.isArray(s.layoutNodes) ? s.layoutNodes : [],
  };
}

function resolveWriteMode(
  tracker: unknown,
): ForeignDataPersistMeta["writeMode"] {
  if (!tracker || typeof tracker !== "object") return "patch";
  const t = tracker as { instance?: string; versionControl?: boolean };
  const single = t.instance === "SINGLE" && !t.versionControl;
  return single ? "upsert_post" : "patch";
}

export type LatestDataRow = {
  gridData: GridDataSnapshot;
  dataSnapshotId: string | null;
  formStatus: string | null | undefined;
};

/**
 * Reads the newest TrackerData row for a tracker (same listing the binding UI uses for options).
 */
export async function fetchLatestDataRow(
  schemaId: string,
  branchName: string = "main",
): Promise<LatestDataRow | null> {
  const res = await fetch(trackerDataListUrl(schemaId, { branchName }));
  if (!res.ok) return null;
  const payload = parseDataPayload(await res.json());
  const gridData: GridDataSnapshot =
    payload.data && typeof payload.data === "object" ? payload.data : {};
  return {
    gridData,
    dataSnapshotId: null,
    formStatus: undefined,
  };
}

/**
 * Parallel load of schema + latest data for one foreign binding source.
 * Returns `null` only when the request pair throws (network / parse crash).
 *
 * @param schemaId - The tracker schema ID to load
 * @param preview - If true, only loads first 7 rows (for initial display). Lazy loader will fetch rest on demand.
 */
export async function loadForeignBindingSource(
  schemaId: string,
  preview = true,
  branchName: string = "main",
): Promise<ForeignSourceBundle | null> {
  try {
    const [dataRes, schemaRes] = await Promise.all([
      fetch(trackerDataListUrl(schemaId, { preview, branchName })),
      fetch(trackerUrl(schemaId)),
    ]);

    let gridData: GridDataSnapshot = {};
    const dataSnapshotId: string | null = null;
    const formStatus: string | null | undefined = undefined;
    let dataHydrated = false;

    if (dataRes.ok) {
      const payload = parseDataPayload(await dataRes.json());
      dataHydrated = true;
      if (payload.data && typeof payload.data === "object") {
        gridData = payload.data;
      }
    }

    let schemaSlice: ForeignBindingSourceSchema | null = null;
    let writeMode: ForeignDataPersistMeta["writeMode"] = "patch";
    if (schemaRes.ok) {
      const tracker = await schemaRes.json();
      schemaSlice = parseSchemaSliceFromTrackerJson(tracker);
      writeMode = resolveWriteMode(tracker);
    }

    const persist: ForeignDataPersistMeta = {
      writeMode,
      dataSnapshotId,
      formStatus,
      hydrated: dataHydrated && schemaRes.ok,
    };

    return { gridData, schemaSlice, persist };
  } catch {
    return null;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const j = await res.json().catch(() => ({}));
  return typeof j?.error === "string"
    ? j.error
    : `Request failed (${res.status})`;
}

export type PersistForeignBindingResult =
  | {
    kind: "saved";
    serverData?: GridDataSnapshot;
    newSnapshotId?: string;
    /** After creating the first row, subsequent saves should PATCH. */
    nextWriteMode?: ForeignDataPersistMeta["writeMode"];
  }
  | { kind: "failed"; message: string };

function applyInlineOrchestrationEffects(json: unknown) {
  if (!json || typeof json !== "object") return;
  const o = (json as { orchestration?: { effects?: { redirect?: { url?: string } } } })
    .orchestration;
  const url = o?.effects?.redirect?.url;
  if (typeof url === "string" && url.length > 0 && typeof window !== "undefined") {
    window.location.assign(url);
  }
}

/**
 * Writes a full grid snapshot to the foreign tracker’s TrackerData using the same rules as auto-save.
 */
export async function persistForeignBindingSnapshot(options: {
  sourceSchemaId: string;
  meta: ForeignDataPersistMeta;
  snapshot: GridDataSnapshot;
  branchName?: string;
}): Promise<PersistForeignBindingResult> {
  const { sourceSchemaId, meta, snapshot, branchName = "main" } = options;
  const body: Record<string, unknown> = { data: snapshot, branchName };
  if (meta.formStatus !== undefined) {
    body.formStatus = meta.formStatus;
  }

  try {
    if (meta.writeMode === "upsert_post") {
      const res = await fetch(trackerDataWriteUrl(sourceSchemaId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return { kind: "failed", message: await readErrorMessage(res) };
      }
      const saved = (await res.json()) as { data?: GridDataSnapshot };
      applyInlineOrchestrationEffects(saved);
      return {
        kind: "saved",
        serverData:
          saved?.data && typeof saved.data === "object"
            ? saved.data
            : undefined,
      };
    }

    if (meta.dataSnapshotId) {
      const res = await fetch(
        trackerDataItemUrl(sourceSchemaId, meta.dataSnapshotId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        return { kind: "failed", message: await readErrorMessage(res) };
      }
      const saved = (await res.json()) as { data?: GridDataSnapshot };
      applyInlineOrchestrationEffects(saved);
      return {
        kind: "saved",
        serverData:
          saved?.data && typeof saved.data === "object"
            ? saved.data
            : undefined,
      };
    }

    const res = await fetch(trackerDataWriteUrl(sourceSchemaId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { kind: "failed", message: await readErrorMessage(res) };
    }
    const saved = (await res.json()) as {
      id?: string;
      data?: GridDataSnapshot;
    };
    applyInlineOrchestrationEffects(saved);
    return {
      kind: "saved",
      serverData:
        saved?.data && typeof saved.data === "object" ? saved.data : undefined,
      newSnapshotId: typeof saved?.id === "string" ? saved.id : undefined,
      nextWriteMode: "patch",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { kind: "failed", message };
  }
}
