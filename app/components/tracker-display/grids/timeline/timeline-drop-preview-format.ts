import type { TimelineView } from "./types";

/** Floating chip next to the pointer while dragging a bar (day vs multi-day views). */
export function formatTimelineDropPreviewLabel(
  day: Date,
  view: TimelineView,
): string {
  if (view === "day") {
    return day.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return day.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
