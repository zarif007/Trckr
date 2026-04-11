# Timeline grid (`grids/timeline`)

Tracker **timeline** surface: swimlanes, proportional bars over a configurable day window, **@dnd-kit** drag (change swimlane / shift dates on the axis), and the same **row add / edit** stack as table/kanban (`EntryWayButton`, `EntryFormDialog`, `grids/shared` row API).

## Boundaries

- **This folder**: time window math, swimlane grouping (option-backed lanes match kanban: all options + Unassigned), overlap stacking for bars, canvas hit-testing for “add at date”, drag persistence + binding parity with kanban column moves.
- **`grids/shared`**: row source + entry metadata; persistence helpers live in **`@/lib/tracker-grid-rows`** (re-exported from `grids/shared`).
- **`grids/data-table`**: shared entry dialog implementation.
- **`@/lib/date-field-value`**: `date` field strings ↔ local calendar days (used by domain parsing and table inputs).

## Module layout

| File / area | Role |
|-------------|------|
| `TrackerTimelineGrid.tsx` | Shell: toolbar, scroll, dialogs, persistence; composes `TimelineCanvas` + hooks. |
| `useTimelineGridModel.ts` | View state, navigation, memoized `TimelineItem[]`, range labels, `timeAxisMinWidthPx`. |
| `TimelineCanvas.tsx` | `DndContext` orchestration: sensors, drag end, drop preview hook, composes strip subcomponents. |
| `TimelineStripTimeAxis.tsx` | Sticky day header row (corner label + proportional ticks). |
| `TimelineSwimlaneTrack.tsx` | One swimlane: label column, droppable track, grid lines, bars, empty hint. |
| `TimelineDraggableBar.tsx` | Single bar + drag handle vs title click. |
| `TimelineStripEmptyState.tsx` | Full-area empty state when no bars in range. |
| `timeline-domain.ts` | Pure domain: calendar days, `buildTimelineItems`, lanes, stack layout, date shift, DnD id strings. |
| `timeline-strip-geometry.ts` | Pure **pixel / %** layout for the strip (bar height, `left`/`width`, axis height). |
| `timeline-canvas-model.ts` | Pure canvas prep: day markers, label skipping, `groupPlacedBarsByLane`, lane id parse. |
| `timeline-dnd.ts` | Shared collision detection for timeline drag. |
| `timeline-drop-preview-format.ts` | Locale string for floating drop chip. |
| `useTimelineStripDropPreview.ts` | Pointer tracking → calendar day + horizontal % while dragging. |
| `timeline-field-ids.ts` | Resolve date / end / title / swimlane fields from config + layout. |
| `types.ts` | Props + `TimelineItem`, `PlacedTimelineBar`, canvas payload types. |
| `index.ts` | Public exports. |

## Row data

Same contract as calendar: `useTrackerGridRowsFromApi` (`../shared/README.md`).

## Extension points

- **Zoom presets**: extend `TimelineView` and `viewSpanDays` in `timeline-domain.ts`.
- **Strip sizing**: `TIMELINE_STRIP_LAYOUT` in `timeline-strip-geometry.ts` (bar height, padding, axis heights); min scroll width in `timeAxisMinWidthPx` (`timeline-domain.ts`).

## Tests

- `__tests__/timeline-domain.test.ts` — inclusive end dates, ordering, stack placement.
- `__tests__/timeline-strip-geometry.test.ts` — % mapping, bar style, track height.
- `__tests__/timeline-canvas-model.test.ts` — markers, grouping, DnD lane id parse.
