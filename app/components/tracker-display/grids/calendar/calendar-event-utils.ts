import type { CalendarCellEvent } from "./types";

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

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function buildCellEventsForDate(
  rows: Array<Record<string, unknown>>,
  date: Date,
  dateFieldId: string | undefined,
): CalendarCellEvent[] {
  return rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => {
      const rowDate = parseRowDateValue(row, dateFieldId);
      if (!rowDate) return false;
      return isSameCalendarDay(rowDate, date);
    });
}
