/**
 * Shared date utilities for calendar and timeline grids
 *
 * All date parsing and manipulation logic is consolidated here to ensure
 * consistent behavior across grids and prevent timezone-related bugs.
 */

/**
 * Parses a calendar day value to a local Date at midnight
 *
 * Supports:
 * - YYYY-MM-DD strings (calendar-day-only format)
 * - ISO datetime strings (extracts date portion)
 * - Date objects (normalizes to local midnight)
 *
 * @returns Date at local midnight (hours/minutes/seconds/ms = 0), or null if invalid
 */
export function parseCalendarDayLocal(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    // Normalize to midnight
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
  }

  const str = String(value);

  // YYYY-MM-DD format (calendar-day-only)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (isNaN(date.getTime())) return null;

    // Validate that Date didn't auto-correct invalid values
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }

    return date;
  }

  // ISO datetime or other parseable format - extract date portion
  const date = new Date(str);
  if (isNaN(date.getTime())) return null;

  // Normalize to local midnight
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Formats a Date to YYYY-MM-DD calendar-day-only string
 *
 * @param date Date to format
 * @returns String in YYYY-MM-DD format (e.g., "2024-06-15")
 */
export function formatCalendarDayLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a value is a calendar-day-only string (YYYY-MM-DD)
 *
 * @param value Value to check
 * @returns True if value matches YYYY-MM-DD format
 */
export function isCalendarDayOnlyString(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Checks if two Dates represent the same calendar day
 *
 * Ignores time portion - only compares year, month, and day
 *
 * @param d1 First date
 * @param d2 Second date
 * @returns True if same calendar day
 */
export function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Adds days to a date
 *
 * @param date Base date
 * @param days Number of days to add (can be negative)
 * @returns New Date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculates the number of days between two dates
 *
 * Uses UTC normalization to avoid DST issues
 *
 * @param start Start date
 * @param end End date
 * @returns Number of days (can be negative if end < start)
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Gets the start of the week containing the given date
 *
 * @param date Date to find week start for
 * @param weekStartsOn Day of week to start on (0 = Sunday, 1 = Monday)
 * @returns Date at midnight of week start
 */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of the week containing the given date
 *
 * @param date Date to find week end for
 * @param weekStartsOn Day of week to start on (0 = Sunday, 1 = Monday)
 * @returns Date at 23:59:59.999 of week end
 */
export function endOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const result = startOfWeek(date, weekStartsOn);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of the month containing the given date
 *
 * @param date Date to find month start for
 * @returns Date at midnight of month's first day
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Gets the end of the month containing the given date
 *
 * @param date Date to find month end for
 * @returns Date at 23:59:59.999 of month's last day
 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Creates a date range (inclusive)
 *
 * @param start Start date
 * @param end End date
 * @returns Array of Dates from start to end (inclusive)
 */
export function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Checks if a date is today (local timezone)
 *
 * @param date Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  return isSameCalendarDay(date, new Date());
}

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 *
 * @param date Date to check
 * @returns True if Saturday or Sunday
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
