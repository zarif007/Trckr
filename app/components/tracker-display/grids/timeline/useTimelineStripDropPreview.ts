"use client";

import { useEffect, useMemo, useState } from "react";
import {
  localDayStartFromTimelineMs,
  timelineInstantLeftPercent,
} from "./timeline-strip-geometry";

const TRACK_SELECTOR = '[data-timeline-track="1"]';

export interface TimelineDropPreviewState {
  readonly day: Date;
  readonly clientX: number;
  readonly clientY: number;
}

interface UseTimelineStripDropPreviewParams {
  readonly activeBarId: string | null;
  readonly timelineDragEnabled: boolean;
  readonly rangeStart: Date;
  readonly rangeEnd: Date;
}

/**
 * While a bar is being dragged, follows the pointer and maps position to a **local calendar day**
 * for the floating label and vertical preview line. Uses capture phase so it still runs if a
 * child stops propagation.
 */
export function useTimelineStripDropPreview({
  activeBarId,
  timelineDragEnabled,
  rangeStart,
  rangeEnd,
}: UseTimelineStripDropPreviewParams): {
  dropPreview: TimelineDropPreviewState | null;
  dropPreviewLeftPct: number | null;
} {
  const [dropPreview, setDropPreview] = useState<TimelineDropPreviewState | null>(
    null,
  );

  useEffect(() => {
    if (!activeBarId || !timelineDragEnabled) {
      setDropPreview(null);
      return;
    }

    const onPointerMove = (ev: PointerEvent) => {
      const stack = document.elementsFromPoint(ev.clientX, ev.clientY);
      const track = stack.find(
        (n): n is HTMLElement =>
          n instanceof HTMLElement && n.matches(TRACK_SELECTOR),
      );
      if (!track) {
        setDropPreview(null);
        return;
      }
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
      const p = rect.width > 0 ? x / rect.width : 0;
      const totalMs = rangeEnd.getTime() - rangeStart.getTime();
      if (totalMs <= 0) {
        setDropPreview(null);
        return;
      }
      const ms = rangeStart.getTime() + p * totalMs;
      const day = localDayStartFromTimelineMs(ms);
      setDropPreview({
        day,
        clientX: ev.clientX,
        clientY: ev.clientY,
      });
    };

    window.addEventListener("pointermove", onPointerMove, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      setDropPreview(null);
    };
  }, [activeBarId, timelineDragEnabled, rangeStart, rangeEnd]);

  const dropPreviewLeftPct = useMemo(() => {
    if (!dropPreview) return null;
    return timelineInstantLeftPercent(dropPreview.day, rangeStart, rangeEnd);
  }, [dropPreview, rangeStart, rangeEnd]);

  return { dropPreview, dropPreviewLeftPct };
}
