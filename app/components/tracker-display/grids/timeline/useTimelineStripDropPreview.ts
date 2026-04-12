"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<TimelineDropPreviewState | null>(null);

  useEffect(() => {
    if (!activeBarId || !timelineDragEnabled) {
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      pendingRef.current = null;
      setDropPreview(null);
      return;
    }

    const flush = () => {
      rafRef.current = 0;
      const next = pendingRef.current;
      if (!next) return;
      setDropPreview((prev) => {
        if (
          prev &&
          prev.day.getTime() === next.day.getTime() &&
          prev.clientX === next.clientX &&
          prev.clientY === next.clientY
        ) {
          return prev;
        }
        return next;
      });
    };

    const onPointerMove = (ev: PointerEvent) => {
      const stack = document.elementsFromPoint(ev.clientX, ev.clientY);
      const track = stack.find(
        (n): n is HTMLElement =>
          n instanceof HTMLElement && n.matches(TRACK_SELECTOR),
      );
      if (!track) {
        pendingRef.current = null;
        if (rafRef.current !== 0) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
        setDropPreview(null);
        return;
      }
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
      const p = rect.width > 0 ? x / rect.width : 0;
      const totalMs = rangeEnd.getTime() - rangeStart.getTime();
      if (totalMs <= 0) {
        pendingRef.current = null;
        if (rafRef.current !== 0) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
        setDropPreview(null);
        return;
      }
      const ms = rangeStart.getTime() + p * totalMs;
      const day = localDayStartFromTimelineMs(ms);
      pendingRef.current = {
        day,
        clientX: ev.clientX,
        clientY: ev.clientY,
      };
      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { capture: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove, { capture: true });
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      pendingRef.current = null;
      setDropPreview(null);
    };
  }, [activeBarId, timelineDragEnabled, rangeStart, rangeEnd]);

  const dropPreviewLeftPct = useMemo(() => {
    if (!dropPreview) return null;
    return timelineInstantLeftPercent(dropPreview.day, rangeStart, rangeEnd);
  }, [dropPreview, rangeStart, rangeEnd]);

  return { dropPreview, dropPreviewLeftPct };
}
