# Tracker grid views (`grids/`)

Feature-local **view implementations** for tracker grid data: table, kanban, calendar, timeline, div/form, plus **shared** hooks used by non-table surfaces.

## Module map

| Directory     | Purpose                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `data-table/` | TanStack-based table + cells + `EntryFormDialog` primitives (see `data-table/README.md`)        |
| `kanban/`     | Kanban columns, cards, DnD zones, `useKanbanGroups`, `usePaginatedKanbanColumnSources` (column discovery); pure merge lives in `lib/tracker-grid-rows/kanban-column-discovery` |
| `calendar/`   | Month / week / day calendar over rows (`calendar/README.md`)                                   |
| `timeline/`   | Swimlane timeline (`timeline/README.md`)                                                      |
| `shared/`     | Row API vs snapshot + entry form metadata + persistence helpers (`shared/README.md`)           |
| `div/`        | Form-style “div” grid                                                                            |

## Integration

`GridViewContent.tsx` switches on `view.type` and mounts the appropriate tracker wrapper (`TrackerTableGrid`, `TrackerCalendarGrid`, etc.). Each wrapper:

1. Resolves rows via `shared/useTrackerGridRowsFromApi` when it needs table/kanban parity.
2. Builds `EntryFormDialog` metadata via `shared/useLayoutGridEntryForm` or a richer table-specific builder.
3. Persists adds/edits via `@/lib/tracker-grid-rows` (`persistNewTrackerGridRow`, `persistNewKanbanCardViaRowApi`, etc.); `shared/grid-entry-persistence` re-exports for convenience.

## Adding a new grid view

1. Add a folder under `grids/<name>/` with `README.md`, `index.ts`, and a `Tracker*Grid` entry component.
2. Register the type in schema / `GridViewContent` / builder prompts as needed.
3. Prefer **pure domain helpers** + **one primary hook** per surface (see `calendar/` and `timeline/`).
