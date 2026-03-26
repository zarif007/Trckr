# Master data chat audit

This folder defines the **audit trail** for module/project-scoped master data binding as it appears in the **tracker builder chat**: expandable **Functions** (logical steps such as reusable-tracker lookup) and **Created** (new trackers in the Master Data module).

It is intentionally separate from `applyMasterDataBindings` in [`../bindings.ts`](../bindings.ts): bindings performs the work; this module defines the **contract** for what we persist and render.

## When does this run?

1. User generates a tracker with `masterDataScope` `module` or `project` and placeholders / specs.
2. [`useTrackerChat`](../../../app/tracker/hooks/useTrackerChat.ts) calls `POST /api/master-data/build`.
3. The API returns `{ tracker, actions, createdTrackerIds }` from `applyMasterDataBindings`.
4. The client keeps `actions` + `createdTrackerIds` as a **`MasterDataBuildAudit`** on the assistant message and persists it on `Message.masterDataBuildResult` (JSON).

## Data shape

| Field | Meaning |
|--------|--------|
| `actions[]` | One entry per resolved binding spec: `reuse` (linked to existing tracker) or `create` (new tracker in Master Data module). |
| `createdTrackerIds` | Ids of trackers created in that pass (subset of `actions` where `type === 'create'`). |

**Zod** in `schema.ts` is the single source of truth. Use `parseMasterDataBuildAuditFromUnknown()` for any untrusted JSON (API load, migrations, future imports).

## Extending safely

1. **New function-style steps in the UI**  
   - Add a constant in `constants.ts`.  
   - Either map each `MasterDataBindingAction` to a row (current pattern) or extend the persisted JSON in a **backward-compatible** way (additive fields, version key if needed) and update `schema.ts` + migration notes.

2. **New action types from the server**  
   - Extend the enum in `bindings.ts` push sites and in `masterDataBindingActionSchema` together.  
   - Add tests in `__tests__/schema.test.ts`.

3. **UI**  
   - Components live under [`app/components/tracker-page/master-data-chat-audit/`](../../../app/components/tracker-page/master-data-chat-audit/). Keep presentation there; keep parsing/formatting here.

## Related files

| Area | File |
|------|------|
| Binding logic | [`../bindings.ts`](../bindings.ts) |
| Build API | [`../../../app/api/master-data/build/route.ts`](../../../app/api/master-data/build/route.ts) |
| Persist message | [`../../../app/api/conversations/[id]/messages/route.ts`](../../../app/api/conversations/[id]/messages/route.ts) |
| Chat hook | [`../../../app/tracker/hooks/useTrackerChat.ts`](../../../app/tracker/hooks/useTrackerChat.ts) |
