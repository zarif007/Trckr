import type { TrackerResponse } from "@/app/tracker/hooks/useTrackerChat";

export type TrackerPageRecord = {
  id: string;
  name: string | null;
  schema: unknown;
  projectId?: string;
  moduleId?: string | null;
  type?: string;
  systemType?: string | null;
  instance?: string;
  versionControl?: boolean;
  autoSave?: boolean;
  listForSchemaId?: string | null;
  ownerScopeSettings?: unknown;
};

/** Merge tracker.name into schema so the view and top bar show the correct name. */
export function schemaWithTrackerName(data: TrackerPageRecord): TrackerResponse {
  const base = (data.schema ?? {}) as TrackerResponse;
  const name = data.name ?? base?.name ?? null;
  if (name != null) return { ...base, name };
  return base;
}
