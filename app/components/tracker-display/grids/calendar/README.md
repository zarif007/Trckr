# Calendar grid (`grids/calendar`)

Tracker **calendar** surface: month, week, and day layouts over the same **multi-row** model as table/kanban. Add/edit use `EntryFormDialog` + row API or snapshot persistence via `grids/shared`.

## Boundaries

- **This folder**: calendar-specific UX, date indexing of rows, view chrome.
- **`grids/shared`**: row source (`useTrackerGridRowsFromApi`), entry metadata (`useLayoutGridEntryForm`), create/patch persistence.
- **`grids/data-table`**: `EntryFormDialog`, `FieldMetadata` types — not duplicated here.

## Files

| File                      | Role                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `TrackerCalendarGrid.tsx` | Composes hooks, toolbar, scroll shell, dialogs                       |
| `useCalendarGridModel.ts` | View state + navigation + memoized month/week structures             |
| `MonthView.tsx`           | 6×7 month body (memo)                                                |
| `WeekView.tsx`            | 7-column week body (memo)                                            |
| `DayView.tsx`             | Single-day hourly strip (memo)                                       |
| `calendar-month-utils.ts` | Pure builders for month cells and week range                         |
| `calendar-event-utils.ts` | Pure helpers: same calendar day, events for a date                 |
| `calendar-field-ids.ts`   | Resolve `dateField` / `titleField` from config + layout              |
| `constants.ts`            | Weekday labels                                                       |
| `types.ts`                | `TrackerCalendarGridProps`, `CalendarView`, `CalendarCellEvent`      |
| `index.ts`                | Public exports                                                       |

## Row data

Rows are resolved exactly like `TrackerTableGrid` (see `useTrackerGridRowsFromApi` in `../shared/README.md`).

## Extension points

- **New calendar mode**: extend `CalendarView` in `types.ts`, add navigation step in `useCalendarGridModel`, add a view component, branch in `TrackerCalendarGrid`.
- **Different event grouping**: adjust `buildCellEventsForDate` in `calendar-event-utils.ts`.
