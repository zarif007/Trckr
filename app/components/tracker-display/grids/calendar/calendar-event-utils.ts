import type { CalendarCellEvent } from "./types";
import { parseCalendarDayLocal, addDays } from "@/lib/date-utils";

export function parseRowDateValue(
  row: Record<string, unknown>,
  dateFieldId: string | undefined,
): Date | null {
  if (!dateFieldId) return null;
  const value = row[dateFieldId];
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parses event date and time information from a row
 *
 * Returns date, hour (0-23), and minute (0-59) if available.
 * Hour and minute are undefined for date-only values.
 *
 * @param row Row data
 * @param fieldId Field ID to parse
 * @returns Object with date, hour, minute, or null if invalid
 */
export function parseEventDateTime(
  row: Record<string, unknown>,
  fieldId: string | undefined,
): { date: Date; hour?: number; minute?: number } | null {
  if (!fieldId) return null;
  const value = row[fieldId];
  if (!value) return null;

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;

  // Check if value includes time information
  // ISO datetime strings have 'T' separator (e.g., "2024-06-15T14:30:00Z")
  const hasTime = String(value).includes('T');

  if (hasTime) {
    return {
      date,
      hour: date.getHours(),
      minute: date.getMinutes(),
    };
  }

  // Date-only value - return date without time
  return { date };
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/**
 * Calculates the end date for an event given a start date and duration in days
 *
 * Duration represents the number of days the event lasts:
 * - duration = 1: single day (start date only)
 * - duration = 2: two days (start date + 1 day)
 * - duration = 3: three days (start date + 2 days)
 *
 * @param startDate Event start date
 * @param durationDays Duration in days (can be fractional)
 * @returns End date (start date + floor(duration - 1) days)
 */
export function calculateEventEndDate(startDate: Date, durationDays: number): Date {
  const daysToAdd = Math.max(0, Math.floor(durationDays) - 1);
  return addDays(startDate, daysToAdd);
}

/**
 * Builds a CalendarCellEvent with all metadata (time, duration, endDate)
 *
 * @param row Row data
 * @param rowIndex Row index
 * @param dateFieldId Date field ID
 * @param durationFieldId Optional duration field ID
 * @returns CalendarCellEvent or null if date is invalid
 */
export function buildCalendarEvent(
  row: Record<string, unknown>,
  rowIndex: number,
  dateFieldId: string | undefined,
  durationFieldId: string | undefined,
): CalendarCellEvent | null {
  // Parse date and time
  const timeInfo = parseEventDateTime(row, dateFieldId);
  if (!timeInfo) return null;

  // Parse duration (defaults to 1 day if not specified)
  const duration = durationFieldId
    ? Number(row[durationFieldId]) || 1
    : 1;

  // Calculate end date
  const endDate = calculateEventEndDate(timeInfo.date, duration);

  return {
    row,
    rowIndex,
    hour: timeInfo.hour,
    minute: timeInfo.minute,
    duration,
    endDate,
  };
}

/**
 * Checks if an event spans a specific date
 *
 * @param event Calendar event
 * @param date Date to check
 * @param startDate Event start date
 * @returns True if event spans the given date
 */
export function eventSpansDate(
  event: CalendarCellEvent,
  date: Date,
  startDate: Date,
): boolean {
  const endDate = event.endDate || startDate;

  // Normalize all dates to midnight for comparison
  const checkDate = parseCalendarDayLocal(date);
  const eventStart = parseCalendarDayLocal(startDate);
  const eventEnd = parseCalendarDayLocal(endDate);

  if (!checkDate || !eventStart || !eventEnd) return false;

  return checkDate >= eventStart && checkDate <= eventEnd;
}

/**
 * Builds calendar events for a specific date, including multi-day events
 *
 * @param rows All rows
 * @param date Date to filter for
 * @param dateFieldId Date field ID
 * @param durationFieldId Optional duration field ID
 * @returns Array of events that occur on the given date
 */
export function buildCellEventsForDate(
  rows: Array<Record<string, unknown>>,
  date: Date,
  dateFieldId: string | undefined,
  durationFieldId?: string | undefined,
): CalendarCellEvent[] {
  return rows
    .map((row, rowIndex) => buildCalendarEvent(row, rowIndex, dateFieldId, durationFieldId))
    .filter((event): event is CalendarCellEvent => {
      if (!event) return false;

      const timeInfo = parseEventDateTime(event.row, dateFieldId);
      if (!timeInfo) return false;

      // Check if this event spans the target date
      return eventSpansDate(event, date, timeInfo.date);
    });
}
