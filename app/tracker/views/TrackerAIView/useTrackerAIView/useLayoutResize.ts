"use client";

import { useCallback, useRef, useState, type RefObject } from "react";

import { MIN_LEFT_PX, MIN_RIGHT_PX } from "../types";

export function useLayoutResize(
  containerRef: RefObject<HTMLDivElement | null>,
  isChatOpen: boolean,
  isDesktop: boolean,
) {
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const clampLeft = useCallback((clientX: number, containerWidth: number) => {
    const maxLeft = Math.max(MIN_LEFT_PX, containerWidth - MIN_RIGHT_PX);
    return Math.min(Math.max(MIN_LEFT_PX, clientX), maxLeft);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isChatOpen || !isDesktop) return;
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      pointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);

      const rect = container.getBoundingClientRect();
      setLeftWidth(clampLeft(e.clientX - rect.left, rect.width));

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerIdRef.current) return;
        const r = container.getBoundingClientRect();
        setLeftWidth(clampLeft(ev.clientX - r.left, r.width));
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerIdRef.current) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          e.currentTarget.releasePointerCapture(ev.pointerId);
        } catch {
          /* capture may already be released */
        }
        pointerIdRef.current = null;
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [isChatOpen, isDesktop, containerRef, clampLeft],
  );

  return { leftWidth, handlePointerDown };
}
