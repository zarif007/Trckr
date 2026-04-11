import { format, parse } from "date-fns";

const CALENDAR_DAY_VALUE = /^\d{4}-\d{2}-\d{2}$/;
/** Legacy date-picker output: UTC midnight for the chosen calendar day (misaligns on non-UTC zones). */
const UTC_MIDNIGHT_ISO = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/;

function parseYmdLocal(ymd: string): Date | null {
  const d = parse(ymd, "yyyy-MM-dd", new Date(0));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calendar day string for a `date` field (`YYYY-MM-DD` in the user's local zone).
 */
export function formatDateFieldCalendarDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Parses stored `date` field values for display and editing.
 * - `YYYY-MM-DD` → local midnight that calendar day
 * - `YYYY-MM-DDT00:00:00(.000)Z` → same (legacy picker storage)
 * - other strings → `Date` parse
 * - `Date` → returned as-is
 */
export function parseDateFieldStoredValue(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const s = String(value).trim();
  if (CALENDAR_DAY_VALUE.test(s)) {
    const d = parseYmdLocal(s);
    return d ?? undefined;
  }
  const utcMid = UTC_MIDNIGHT_ISO.exec(s);
  if (utcMid) {
    const d = parseYmdLocal(utcMid[1]);
    return d ?? undefined;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function isDateFieldCalendarDayString(value: unknown): boolean {
  return typeof value === "string" && CALENDAR_DAY_VALUE.test(value.trim());
}
