import type { ForeignBindingSourceSchema } from "@/lib/dynamic-options";

/** Full grid snapshot keyed by grid id (matches TrackerData JSON shape). */
export type GridDataSnapshot = Record<string, Array<Record<string, unknown>>>;

/**
 * How we persist a snapshot for another tracker when the user adds an option row
 * from a field bound to that tracker’s grid.
 *
 * - `upsert_post`: single-instance tracker without version control → POST uses server upsert.
 * - `patch`: multi-instance or version control → PATCH existing row, or POST first row then PATCH.
 */
export type ForeignDataPersistMeta = {
  writeMode: "upsert_post" | "patch";
  dataSnapshotId: string | null;
  formStatus: string | null | undefined;
  /** GET /data succeeded; combined with schema GET so we never PATCH a guessed snapshot. */
  hydrated: boolean;
};

/**
 * Everything we need from one foreign tracker for bound options:
 * live grid rows, schema slice for “add option” form, and persist metadata.
 */
export type ForeignSourceBundle = {
  gridData: GridDataSnapshot;
  schemaSlice: ForeignBindingSourceSchema | null;
  persist: ForeignDataPersistMeta;
};
