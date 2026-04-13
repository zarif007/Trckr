"use client";

import { useDroppable } from "@dnd-kit/core";
import { widgetDropZoneId } from "@/lib/boards/board-drag-utils";

interface WidgetDropZonesProps {
  widgetId: string;
  enabled: boolean;
}

/**
 * Invisible drop target zones for a widget.
 * Creates 4 zones (left, right, above, below) for directional placement.
 */
export function WidgetDropZones({ widgetId, enabled }: WidgetDropZonesProps) {
  const { setNodeRef: setLeftRef } = useDroppable({
    id: widgetDropZoneId(widgetId, "left"),
    disabled: !enabled,
  });

  const { setNodeRef: setRightRef } = useDroppable({
    id: widgetDropZoneId(widgetId, "right"),
    disabled: !enabled,
  });

  const { setNodeRef: setAboveRef } = useDroppable({
    id: widgetDropZoneId(widgetId, "above"),
    disabled: !enabled,
  });

  const { setNodeRef: setBelowRef } = useDroppable({
    id: widgetDropZoneId(widgetId, "below"),
    disabled: !enabled,
  });

  if (!enabled) return null;

  return (
    <>
      {/* Left zone: 20% width on left edge */}
      <div
        ref={setLeftRef}
        className="absolute inset-y-0 left-0 w-[20%] pointer-events-none"
        aria-hidden="true"
      />

      {/* Right zone: 20% width on right edge */}
      <div
        ref={setRightRef}
        className="absolute inset-y-0 right-0 w-[20%] pointer-events-none"
        aria-hidden="true"
      />

      {/* Above zone: 25% height on top edge */}
      <div
        ref={setAboveRef}
        className="absolute inset-x-0 top-0 h-[25%] pointer-events-none"
        aria-hidden="true"
      />

      {/* Below zone: 25% height on bottom edge */}
      <div
        ref={setBelowRef}
        className="absolute inset-x-0 bottom-0 h-[25%] pointer-events-none"
        aria-hidden="true"
      />
    </>
  );
}
