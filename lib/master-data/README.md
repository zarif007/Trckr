# Master Data

This module owns **Master Data** scope resolution, module/container discovery, and the server-side
binding builder that reuses or creates master data trackers as needed. It is intentionally split
into small, composable units so each concern can be tested and evolved independently.

## Responsibilities
- **Scope resolution:** resolve default scope from nearest module ancestor, then project.
- **Module container:** find or create a `Master Data` module marked with `settings.masterDataModule = true`.
- **Schema building:** create a minimal master data tracker (single grid with `name`).
- **Binding builder:** reuse existing master data trackers by normalized name or create new ones, then
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
optionsGrid: "master_data_grid"
labelField: "master_data_grid.name"
```
The server-side builder replaces this placeholder with a real tracker schema id and a concrete
grid/label field from the reused/created master data tracker.

## Invariants
- Master data containers are always modules named **Master Data** with `settings.masterDataModule = true`.
- Reuse is preferred: if a compatible tracker exists in the scoped Master Data module, it is reused.
- No default Master Data tab is created unless scope is `tracker` **and** select fields exist.
- Legacy `shared_tab` is preserved and never renamed.

## Entry Points
- `resolveMasterDataDefaultScope()` — scope inheritance (module chain → project).
- `findOrCreateMasterDataModule()` — module container resolution.
- `applyMasterDataBindings()` — binding creation/reuse and placeholder replacement.
- `buildMasterDataSchema()` — minimal master data tracker schema.

## Tests
See `lib/master-data/__tests__` for coverage of:
- default scope inheritance
- module container creation/reuse
- placeholder replacement + local options grid stripping
