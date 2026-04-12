/**
 * Event color system for calendar and timeline grids
 *
 * Provides consistent color mapping for events based on field values.
 * Status fields map to theme status colors, other fields hash to a color palette.
 */

import type { TrackerField } from "@/app/components/tracker-display/types";

/**
 * Color palette for non-status events
 *
 * Uses subtle background colors with high-contrast text for accessibility
 */
export const EVENT_COLOR_PALETTE = [
  { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200" },
  { bg: "bg-green-50", text: "text-green-900", border: "border-green-200" },
  { bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-200" },
  { bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-200" },
  { bg: "bg-pink-50", text: "text-pink-900", border: "border-pink-200" },
  { bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" },
  { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  { bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-200" },
] as const;

/** Tailwind class triples for event chips (palette or semantic theme tokens). */
export type EventColorClasses = {
  readonly bg: string;
  readonly text: string;
  readonly border: string;
};

/**
 * Default color for events when no color field is specified
 */
const DEFAULT_EVENT_COLOR: EventColorClasses = {
  bg: "bg-primary/10",
  text: "text-primary",
  border: "border-primary/20",
};

/**
 * Status field value → theme status color mappings
 *
 * Maps common status values to semantic colors from the theme
 */
const STATUS_COLOR_MAP: Record<string, EventColorClasses> = {
  completed: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
  },
  in_progress: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/20",
  },
  todo: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-muted",
  },
  blocked: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
  },
  pending: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-muted",
  },
};

/**
 * Hashes a string to a consistent number
 *
 * Uses simple string hashing for consistent color assignment
 *
 * @param str String to hash
 * @returns Positive integer hash
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Resolves event color based on field value
 *
 * Resolution logic:
 * 1. No colorFieldId → default primary color
 * 2. Status field → maps value to theme status colors
 * 3. Other fields → hashes value to color palette index
 *
 * @param row Row data
 * @param colorFieldId Optional field ID to use for color
 * @param fields All tracker fields (to determine field type)
 * @returns Color classes (bg, text, border)
 */
export function resolveEventColor(
  row: Record<string, unknown>,
  colorFieldId: string | undefined,
  fields: TrackerField[],
): EventColorClasses {
  // No color field specified - use default
  if (!colorFieldId) {
    return DEFAULT_EVENT_COLOR;
  }

  const value = row[colorFieldId];
  if (!value) {
    return EVENT_COLOR_PALETTE[0];
  }

  const field = fields.find((f) => f.id === colorFieldId);

  // Status fields → theme status colors
  if (field?.dataType === "status") {
    const key = String(value).toLowerCase().replace(/\s+/g, "_");
    const statusColor = STATUS_COLOR_MAP[key];
    if (statusColor) {
      return statusColor;
    }
    // Unknown status value - fall through to palette
  }

  // Other fields → hash to palette
  const index = hashString(String(value)) % EVENT_COLOR_PALETTE.length;
  return EVENT_COLOR_PALETTE[index];
}

/**
 * Gets all unique values from a field across all rows
 *
 * Useful for building color legends or filters
 *
 * @param rows All rows
 * @param fieldId Field to extract values from
 * @returns Array of unique values (sorted)
 */
export function getUniqueFieldValues(
  rows: Array<Record<string, unknown>>,
  fieldId: string,
): unknown[] {
  const values = new Set<unknown>();

  for (const row of rows) {
    const value = row[fieldId];
    if (value !== null && value !== undefined && value !== "") {
      values.add(value);
    }
  }

  return Array.from(values).sort((a, b) => {
    const aStr = String(a);
    const bStr = String(b);
    return aStr.localeCompare(bStr);
  });
}

/**
 * Builds a color map for all values in a field
 *
 * Useful for rendering legends
 *
 * @param rows All rows
 * @param fieldId Field to build map for
 * @param fields All tracker fields
 * @returns Map of value → color classes
 */
export function buildFieldColorMap(
  rows: Array<Record<string, unknown>>,
  fieldId: string,
  fields: TrackerField[],
): Map<unknown, EventColorClasses> {
  const uniqueValues = getUniqueFieldValues(rows, fieldId);
  const colorMap = new Map<unknown, EventColorClasses>();

  for (const value of uniqueValues) {
    const mockRow = { [fieldId]: value };
    const color = resolveEventColor(mockRow, fieldId, fields);
    colorMap.set(value, color);
  }

  return colorMap;
}
