/**
 * Heuristic completeness checks between the Manager plan and a draft tracker.
 * Used to steer repair passes when the builder under-delivers on large plans.
 */

import type { ManagerSchema } from "@/lib/schemas/multi-agent";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function bindingKeyForFieldPath(fieldPath: string): string {
  const parts = fieldPath.split(".");
  return parts.length >= 2 ? parts.slice(0, 2).join(".") : fieldPath;
}

/**
 * Returns human-readable gap messages (empty when no issues detected).
 */
export function buildCompletenessGapMessages(
  manager: ManagerSchema,
  tracker: Record<string, unknown>,
): string[] {
  const gaps: string[] = [];
  const todoCount = manager.builderTodo?.length ?? 0;
  const tabs = Array.isArray(tracker.tabs) ? tracker.tabs.length : 0;
  const sections = Array.isArray(tracker.sections) ? tracker.sections.length : 0;
  const grids = Array.isArray(tracker.grids) ? tracker.grids.length : 0;
  const fields = Array.isArray(tracker.fields) ? tracker.fields.length : 0;
  const layoutNodes = Array.isArray(tracker.layoutNodes)
    ? tracker.layoutNodes.length
    : 0;

  const manifest = manager.buildManifest;
  if (manifest?.tabIds?.length && tabs < manifest.tabIds.length) {
    gaps.push(
      `Expected at least ${manifest.tabIds.length} tabs (buildManifest), found ${tabs}.`,
    );
  }
  if (manifest?.gridIds?.length && grids < manifest.gridIds.length) {
    gaps.push(
      `Expected at least ${manifest.gridIds.length} grids (buildManifest), found ${grids}.`,
    );
  }

  if (todoCount >= 12 && grids < 2) {
    gaps.push(
      `Manager produced ${todoCount} builderTodo items but only ${grids} grid(s); likely incomplete.`,
    );
  }
  if (todoCount >= 16 && fields < 4) {
    gaps.push(
      `Large plan (${todoCount} tasks) but only ${fields} field(s); likely truncated output.`,
    );
  }
  if (grids >= 2 && fields > 0 && layoutNodes === 0) {
    gaps.push(
      "Grids and fields exist but layoutNodes is empty — fields are not placed in grids.",
    );
  }

  const fieldsArr = Array.isArray(tracker.fields)
    ? (tracker.fields as Array<{ id?: string; dataType?: string }>)
    : [];
  const bindings = isPlainObject(tracker.bindings)
    ? (tracker.bindings as Record<string, unknown>)
    : {};

  const layoutNodesArr = Array.isArray(tracker.layoutNodes)
    ? (tracker.layoutNodes as Array<{ gridId?: string; fieldId?: string }>)
    : [];
  const fieldIdToGridIds = new Map<string, string[]>();
  for (const n of layoutNodesArr) {
    const fid = typeof n.fieldId === "string" ? n.fieldId : "";
    const gid = typeof n.gridId === "string" ? n.gridId : "";
    if (!fid || !gid) continue;
    const list = fieldIdToGridIds.get(fid) ?? [];
    list.push(gid);
    fieldIdToGridIds.set(fid, list);
  }

  const optionLike = fieldsArr.filter(
    (f) => f?.dataType === "options" || f?.dataType === "multiselect",
  );
  for (const f of optionLike) {
    const id = typeof f.id === "string" ? f.id : "";
    if (!id) continue;
    const gridIdsForField = fieldIdToGridIds.get(id);
    if (!gridIdsForField?.length) {
      gaps.push(
        `Select/multiselect field "${id}" has no layoutNodes placement (cannot verify binding).`,
      );
      continue;
    }
    for (const gid of gridIdsForField) {
      const key = bindingKeyForFieldPath(`${gid}.${id}`);
      const entry = bindings[key];
      if (!isPlainObject(entry)) {
        gaps.push(
          `Select/multiselect field "${id}" on grid "${gid}" has no bindings entry at "${key}".`,
        );
      }
    }
  }

  if (manifest?.selectFieldPaths?.length) {
    for (const path of manifest.selectFieldPaths) {
      const key = bindingKeyForFieldPath(path);
      if (!isPlainObject(bindings[key])) {
        gaps.push(
          `buildManifest requires binding for "${path}" but bindings["${key}"] is missing.`,
        );
      }
    }
  }

  if (sections > 0 && grids === 0) {
    gaps.push("Sections exist but there are no grids.");
  }
  if (grids > 0 && fields === 0) {
    gaps.push("Grids exist but there are no fields.");
  }

  return gaps;
}
