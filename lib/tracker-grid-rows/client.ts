import {
  gridDistinctFieldValuesPath,
  gridRowsListPath,
  trackerDataRowPath,
} from "./api-paths";
import { clampGridRowsLimit, clampGridRowsOffset } from "./limits";
import type { PatchTrackerDataRowBody } from "./row-accent-hex";
import type {
  GridDistinctFieldValuesResponseJson,
  GridRowsCreateResponseJson,
  GridRowsListResponseJson,
  GridRowRecord,
  TrackerDataPatchErrorJson,
} from "./types";

export type FetchGridRowsListParams = {
  trackerId: string;
  gridSlug: string;
  branchName: string;
  limit: number;
  offset: number;
  /** When set, filters rows for kanban columns (JSON path = field id). */
  groupFieldId?: string;
  groupValue?: string;
};

/**
 * Fetches one page of grid rows. Intended for browser use from client hooks.
 * Clamps `limit` / `offset` to the same bounds as the API route.
 */
export async function fetchGridRowsList(
  params: FetchGridRowsListParams,
  init?: RequestInit,
): Promise<{
  ok: boolean;
  status: number;
  rows: GridRowRecord[];
  total: number;
  errorMessage: string | null;
}> {
  const limit = clampGridRowsLimit(params.limit);
  const offset = clampGridRowsOffset(params.offset);
  const sp = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    branch: params.branchName,
  });
  if (params.groupFieldId != null && params.groupFieldId !== "") {
    sp.set("groupFieldId", params.groupFieldId);
    sp.set("groupValue", params.groupValue ?? "");
  }

  const url = gridRowsListPath(params.trackerId, params.gridSlug, sp);
  const res = await fetch(url, init);
  const payload = (await res.json().catch(() => null)) as GridRowsListResponseJson | null;

  if (!res.ok) {
    const msg =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to load rows (${res.status})`;
    return {
      ok: false,
      status: res.status,
      rows: [],
      total: 0,
      errorMessage: msg,
    };
  }

  return {
    ok: true,
    status: res.status,
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
    total: typeof payload?.total === "number" ? payload.total : 0,
    errorMessage: null,
  };
}

export type FetchGridDistinctFieldValuesParams = {
  trackerId: string;
  gridSlug: string;
  branchName: string;
  fieldKey: string;
};

export async function fetchGridDistinctFieldValues(
  params: FetchGridDistinctFieldValuesParams,
  init?: RequestInit,
): Promise<{
  ok: boolean;
  status: number;
  values: string[];
  errorMessage: string | null;
}> {
  const sp = new URLSearchParams({
    fieldKey: params.fieldKey,
    branch: params.branchName,
  });
  const url = gridDistinctFieldValuesPath(
    params.trackerId,
    params.gridSlug,
    sp,
  );
  const res = await fetch(url, init);
  const payload = (await res.json().catch(() => null)) as
    | GridDistinctFieldValuesResponseJson
    | null;

  if (!res.ok) {
    const msg =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to load distinct values (${res.status})`;
    return {
      ok: false,
      status: res.status,
      values: [],
      errorMessage: msg,
    };
  }

  return {
    ok: true,
    status: res.status,
    values: Array.isArray(payload?.values) ? payload.values : [],
    errorMessage: null,
  };
}

export type { PatchTrackerDataRowBody } from "./row-accent-hex";

export async function patchTrackerDataRow(
  trackerId: string,
  rowId: string,
  patchBody: PatchTrackerDataRowBody,
): Promise<void> {
  const payload: Record<string, unknown> = { data: patchBody.data };
  if (patchBody.rowAccentHex !== undefined)
    payload.rowAccentHex = patchBody.rowAccentHex;
  const res = await fetch(trackerDataRowPath(trackerId, rowId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errJson = (await res.json().catch(() => null)) as TrackerDataPatchErrorJson | null;
    throw new Error(
      typeof errJson?.error === "string"
        ? errJson.error
        : `PATCH failed (${res.status})`,
    );
  }
}

export async function deleteTrackerDataRow(
  trackerId: string,
  rowId: string,
): Promise<void> {
  const res = await fetch(trackerDataRowPath(trackerId, rowId), {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`DELETE failed (${res.status})`);
  }
}

export async function createGridRow(
  trackerId: string,
  gridSlug: string,
  branchName: string,
  data: Record<string, unknown>,
): Promise<GridRowRecord> {
  const url = gridRowsListPath(trackerId, gridSlug, new URLSearchParams());
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, branchName }),
  });
  const payload = (await res.json().catch(() => null)) as GridRowsCreateResponseJson | null;
  if (!res.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `POST failed (${res.status})`,
    );
  }
  if (!payload?.row || typeof payload.row !== "object") {
    throw new Error("Invalid create row response");
  }
  return payload.row;
}
