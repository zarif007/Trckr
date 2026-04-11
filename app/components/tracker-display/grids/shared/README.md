# Tracker grid shared (`grids/shared`)

Cross-view **hooks and persistence helpers** for tracker grid surfaces that are not the full TanStack data table (calendar, timeline, kanban card form, etc.).

## What belongs here

- **Row source**: logic that must stay aligned with `TrackerTableGrid` (snapshot vs paginated row API).
- **Entry form metadata**: lightweight `FieldMetadata` + `getBindingUpdates` for `EntryFormDialog` when the full table metadata builder is not needed.
- **Persistence**: import from **`@/lib/tracker-grid-rows`** (`persistNewTrackerGridRow`, etc.); `grid-entry-persistence.ts` here is a **thin re-export** for existing calendar/timeline imports.

## What does *not* belong here

- View-specific layout (month cells, swimlanes) — keep in `calendar/` or `timeline/`.
- Generic table primitives — use `grids/data-table/`.

## Files

| File                         | Role                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `useTrackerGridRowsFromApi`  | `rows`, `fullGridData`, `mutateRowsViaRowApi`, `pg` — same contract as table grid       |
| `useLayoutGridEntryForm`     | `gridFields`, `fieldMetadata`, `fieldOrder`, `getBindingUpdates` for entry dialogs     |
| `grid-entry-persistence.ts`  | Re-exports persistence helpers from `@/lib/tracker-grid-rows` (canonical implementation) |
| `index.ts`                  | Public re-exports                                                                       |

## Consumers

- `grids/calendar/TrackerCalendarGrid`
- `grids/timeline/TrackerTimelineGrid`

## Dependencies

- `@/lib/grid-data-loading`, `@/lib/tracker-grid-rows`, `@/lib/binding`, `@/lib/resolve-bindings`
- `../data-table/utils` for `FieldMetadata` (shared with `EntryFormDialog`)
