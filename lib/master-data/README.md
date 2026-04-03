# Master Data

This module owns **Master Data** scope resolution, module/container discovery, and the server-side
binding builder that reuses or creates master data trackers as needed. It is intentionally split
into small, composable units so each concern can be tested and evolved independently.

## Responsibilities
- **Scope resolution:** resolve default scope from nearest module ancestor, then project.
- **Module container:** find or create a `Master Data` module marked with `settings.masterDataModule = true`.
- **Schema building:** use LLM-defined master data tracker schemas when provided; fallback to a minimal schema when missing.
- **Binding builder:** reuse existing master data trackers by spec key or name similarity, then
  bind select/multiselect fields via `optionsSourceSchemaId`.

## Scope Behavior
- `tracker` scope:
  - Local master data grids live inside the tracker.
  - The builder does **not** create module/project master data trackers.
- `module` / `project` scope:
  - Local `_options_grid` grids are removed from the tracker.
  - Bindings use `optionsSourceSchemaId` to reference a tracker in the Master Data module.

## Placeholder Semantics
For module/project scope, LLM output can use a placeholder:
```
optionsSourceSchemaId: "__master_data__"
optionsSourceKey: "student"
optionsGrid: "student_grid"
labelField: "student_grid.full_name"
```
The server-side builder replaces this placeholder with a real tracker schema id and a concrete
grid/label field from the reused/created master data tracker.

## Master Data Trackers (module/project scope)
LLM output can include `masterDataTrackers` entries that define the full schema for reusable master data:
- Each entry has `key`, `name`, `labelFieldId`, and `schema`.
- The schema must include a single grid with an id derived from the tracker key/name (snake_case, ends with `_grid`).
- Fields can be any required attributes (e.g. full_name, age, roll).

## Invariants
- Master data containers are always modules named **Master Data** with `settings.masterDataModule = true`.
- Reuse is preferred: if a compatible tracker exists in the scoped Master Data module, it is reused.
- No default Master Data tab is created unless scope is `tracker` **and** select fields exist.
- Legacy `shared_tab` is preserved and never renamed.
- Master data trackers embed `masterDataMeta` (including grid id + field signatures) for compatibility checks.

## Entry Points
- `resolveMasterDataDefaultScope()` — scope inheritance (module chain → project).
- `findOrCreateMasterDataModule()` — module container resolution.
- `applyMasterDataBindings()` — binding creation/reuse, placeholder replacement, and metadata embedding.
- `buildMasterDataSchema()` — minimal master data tracker schema.

## Tool calls (builder UI)

Module/project binding now logs **master data reuse/create** as tool calls alongside bindings, validations, and calculations. The chat-audit payload is legacy and no longer surfaced in the UI.

- **Tool logging:** `applyMasterDataBindings()` actions are mapped into tool calls in the build-tracker post-process pipeline.
- **Legacy:** [`chat-audit/`](./chat-audit/README.md) remains for historical messages but is not used in new flows.

## Tests
See `lib/master-data/__tests__` for coverage of:
- default scope inheritance
- module container creation/reuse
- placeholder replacement + local options grid stripping
- legacy chat-audit JSON parsing (`chat-audit/__tests__/schema.test.ts`)
