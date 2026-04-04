# Master Data Chat Audit

> **[DEPRECATED]** This audit trail system is no longer used. The build-tracker pipeline now surfaces all master data operations via the unified `ToolCallEntry` system (`lib/agent/tool-calls.ts`), rendered through `ToolCallProgress.tsx`. This module remains for historical reference only.

**Legacy:** This folder defined the audit trail for module/project-scoped master data binding in the tracker builder chat — expandable **Functions** (lookup/reuse steps) and **Created** (new trackers in the Master Data module).

**Replacement:** All master data create/lookup operations are now emitted as tool calls with purpose `master-data-create` or `master-data-lookup` in the postprocess pipeline.

---

## When did this run?

1. User generates a tracker with `masterDataScope` `module` or `project` and placeholders / specs.
2. `useTrackerChat` calls `POST /api/master-data/build`.
3. The API returns `{ tracker, actions, createdTrackerIds }` from `applyMasterDataBindings`.
4. The client keeps `actions` + `createdTrackerIds` as a **`MasterDataBuildAudit`** on the assistant message.

## Data shape

| Field | Meaning |
|--------|--------|
| `actions[]` | One entry per resolved binding spec: `reuse` or `create`. |
| `createdTrackerIds` | Ids of trackers created in that pass. |

## Related files

| Area | File |
|------|------|
| Binding logic | [`../bindings.ts`](../bindings.ts) |
| Build API | [`../../../app/api/master-data/build/route.ts`](../../../app/api/master-data/build/route.ts) |
| Chat hook | [`../../../app/tracker/hooks/useTrackerChat.ts`](../../../app/tracker/hooks/useTrackerChat.ts) |
