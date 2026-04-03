# `useMarqueeSelection`

Rubber-band (marquee) multi-select for a single scrollable region on the dashboard / project surfaces.

## Usage

1. Call `useMarqueeSelection()` once per independent selection group (e.g. one hook for the project grid, another for “Recent trackers”).
2. Spread `rootProps` onto a **`relative`** container that wraps all selectable tiles.
3. While `isDragging && dragRect`, render `<MarqueeSelectionOverlay rect={dragRect} />` (portals to `document.body`).
4. Mark tiles:
   - `data-marquee-selectable`
   - `data-marquee-id="<unique id>"` (e.g. `project:<uuid>`, `tracker:<uuid>`)
5. Mark non-selectable in-root controls (e.g. “New project”): `data-marquee-ignore`.

## Modifier keys (evaluated on pointer up)

| Key   | Behavior                                      |
| ----- | --------------------------------------------- |
| Shift | Union marquee hits with the current selection |
| Other | Replace selection with marquee hits           |

## Empty click

A primary-button press on empty space that does not move past the minimum drag distance clears the selection.

## Escape

Clears the selection when any items are selected.

## Hit testing

The marquee’s width and height are clamped to at least 1px when testing intersections, so a drag that is almost perfectly horizontal or vertical (common on a single row of tiles) still selects items.

## See also

- Implementation: `useMarqueeSelection.ts`
- Overlay: `../components/MarqueeSelectionOverlay.tsx`
