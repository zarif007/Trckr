# Timeline grid (`grids/timeline`)

Tracker **timeline** surface: swimlanes, proportional bars over a configurable day window, and the same **row add / edit** stack as table/kanban (`EntryWayButton`, `EntryFormDialog`, `grids/shared` row API).

## Boundaries

- **This folder**: time window math, swimlane grouping, canvas hit-testing for “add at date”.
- **`grids/shared`**: row source + entry metadata; persistence helpers live in **`@/lib/tracker-grid-rows`** (re-exported from `grids/shared`).
- **`grids/data-table`**: shared entry dialog implementation.

## Files

| File                      | Role                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `TrackerTimelineGrid.tsx` | Shell: toolbar, scroll, dialogs, wires hooks + `TimelineCanvas`      |
| `useTimelineGridModel.ts` | View state, navigation, memoized items + swimlanes + range labels    |
| `TimelineCanvas.tsx`      | Axis + swimlane tracks + bars (memo)                                 |
| `timeline-domain.ts`      | Pure: span days, time range, items, swimlanes, labels, min width    |
| `timeline-field-ids.ts`   | Resolve date / end / title / swimlane fields from config + layout    |
| `types.ts`                | `TrackerTimelineGridProps`, `TimelineView`, `TimelineItem`           |
| `index.ts`                | Public exports                                                       |

## Row data

Same contract as calendar: `useTrackerGridRowsFromApi` (`../shared/README.md`).

## Extension points

- **Zoom presets**: extend `TimelineView` and `viewSpanDays` in `timeline-domain.ts`.
- **Bar layout**: adjust `timelineItemStyle` in `TimelineCanvas.tsx` (e.g. vertical stacking).
