import { describe, it, expect } from 'vitest';
import {
  parseCalendarDayLocal,
  formatCalendarDayLocal,
  isCalendarDayOnlyString,
  isSameCalendarDay,
  addDays,
  daysBetween,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  dateRange,
  isToday,
  isWeekend,
} from '../date-utils';

describe('parseCalendarDayLocal', () => {
  it('parses YYYY-MM-DD format to local midnight', () => {
    const date = parseCalendarDayLocal('2024-06-15');
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(5); // 0-indexed
    expect(date?.getDate()).toBe(15);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
    expect(date?.getSeconds()).toBe(0);
    expect(date?.getMilliseconds()).toBe(0);
  });

  it('handles ISO datetime strings by extracting date portion', () => {
    const date = parseCalendarDayLocal('2024-06-15T14:30:00Z');
    expect(date?.getDate()).toBe(15);
    expect(date?.getHours()).toBe(0); // Normalized to midnight
    expect(date?.getMinutes()).toBe(0);
  });

  it('normalizes Date objects to local midnight', () => {
    const input = new Date(2024, 5, 15, 14, 30, 45, 123);
    const date = parseCalendarDayLocal(input);
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(15);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
    expect(date?.getSeconds()).toBe(0);
    expect(date?.getMilliseconds()).toBe(0);
  });

  it('returns null for invalid strings', () => {
    expect(parseCalendarDayLocal('invalid')).toBeNull();
    expect(parseCalendarDayLocal('2024-13-01')).toBeNull(); // Invalid month
    expect(parseCalendarDayLocal('2024-02-30')).toBeNull(); // Invalid day
  });

  it('returns null for null or undefined', () => {
    expect(parseCalendarDayLocal(null)).toBeNull();
    expect(parseCalendarDayLocal(undefined)).toBeNull();
  });

  it('returns null for invalid Date objects', () => {
    expect(parseCalendarDayLocal(new Date('invalid'))).toBeNull();
  });

  it('handles edge cases - leap years', () => {
    const date = parseCalendarDayLocal('2024-02-29'); // 2024 is leap year
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(1);
    expect(date?.getDate()).toBe(29);
  });

  it('handles edge cases - year boundaries', () => {
    const date = parseCalendarDayLocal('2024-12-31');
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(11);
    expect(date?.getDate()).toBe(31);
  });
});

describe('formatCalendarDayLocal', () => {
  it('formats date to YYYY-MM-DD', () => {
    const date = new Date(2024, 5, 15);
    expect(formatCalendarDayLocal(date)).toBe('2024-06-15');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2024, 0, 5); // Jan 5
    expect(formatCalendarDayLocal(date)).toBe('2024-01-05');
  });

  it('handles year boundaries', () => {
    const date = new Date(2024, 11, 31);
    expect(formatCalendarDayLocal(date)).toBe('2024-12-31');
  });

  it('ignores time portion', () => {
    const date = new Date(2024, 5, 15, 14, 30, 45);
    expect(formatCalendarDayLocal(date)).toBe('2024-06-15');
  });
});

describe('isCalendarDayOnlyString', () => {
  it('returns true for YYYY-MM-DD format', () => {
    expect(isCalendarDayOnlyString('2024-06-15')).toBe(true);
    expect(isCalendarDayOnlyString('2024-01-01')).toBe(true);
    expect(isCalendarDayOnlyString('2024-12-31')).toBe(true);
  });

  it('returns false for ISO datetime strings', () => {
    expect(isCalendarDayOnlyString('2024-06-15T14:30:00Z')).toBe(false);
    expect(isCalendarDayOnlyString('2024-06-15T00:00:00.000Z')).toBe(false);
  });

  it('returns false for invalid formats', () => {
    expect(isCalendarDayOnlyString('06/15/2024')).toBe(false);
    expect(isCalendarDayOnlyString('15-06-2024')).toBe(false);
    expect(isCalendarDayOnlyString('invalid')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isCalendarDayOnlyString(123)).toBe(false);
    expect(isCalendarDayOnlyString(new Date())).toBe(false);
    expect(isCalendarDayOnlyString(null)).toBe(false);
    expect(isCalendarDayOnlyString(undefined)).toBe(false);
  });
});

describe('isSameCalendarDay', () => {
  it('returns true for same day with different times', () => {
    const d1 = new Date(2024, 5, 15, 10, 0);
    const d2 = new Date(2024, 5, 15, 18, 30);
    expect(isSameCalendarDay(d1, d2)).toBe(true);
  });

  it('returns true for same day at midnight', () => {
    const d1 = new Date(2024, 5, 15, 0, 0, 0, 0);
    const d2 = new Date(2024, 5, 15, 23, 59, 59, 999);
    expect(isSameCalendarDay(d1, d2)).toBe(true);
  });

  it('returns false for different days', () => {
    const d1 = new Date(2024, 5, 15);
    const d2 = new Date(2024, 5, 16);
    expect(isSameCalendarDay(d1, d2)).toBe(false);
  });

  it('returns false for different months', () => {
    const d1 = new Date(2024, 5, 15);
    const d2 = new Date(2024, 6, 15);
    expect(isSameCalendarDay(d1, d2)).toBe(false);
  });

  it('returns false for different years', () => {
    const d1 = new Date(2024, 5, 15);
    const d2 = new Date(2025, 5, 15);
    expect(isSameCalendarDay(d1, d2)).toBe(false);
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    const date = new Date(2024, 5, 15);
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(20);
    expect(result.getMonth()).toBe(5);
  });

  it('subtracts days with negative input', () => {
    const date = new Date(2024, 5, 15);
    const result = addDays(date, -5);
    expect(result.getDate()).toBe(10);
    expect(result.getMonth()).toBe(5);
  });

  it('handles month boundaries', () => {
    const date = new Date(2024, 5, 30);
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(6); // July
  });

  it('handles year boundaries', () => {
    const date = new Date(2024, 11, 30);
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(4);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getFullYear()).toBe(2025);
  });

  it('does not mutate original date', () => {
    const original = new Date(2024, 5, 15);
    const result = addDays(original, 5);
    expect(original.getDate()).toBe(15);
    expect(result.getDate()).toBe(20);
  });
});

describe('daysBetween', () => {
  it('calculates positive day difference', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 8);
    expect(daysBetween(start, end)).toBe(7);
  });

  it('handles negative difference', () => {
    const start = new Date(2024, 0, 8);
    const end = new Date(2024, 0, 1);
    expect(daysBetween(start, end)).toBe(-7);
  });

  it('returns 0 for same day', () => {
    const start = new Date(2024, 5, 15, 10, 0);
    const end = new Date(2024, 5, 15, 18, 30);
    expect(daysBetween(start, end)).toBe(0);
  });

  it('handles month boundaries', () => {
    const start = new Date(2024, 0, 25);
    const end = new Date(2024, 1, 5);
    expect(daysBetween(start, end)).toBe(11);
  });

  it('handles year boundaries', () => {
    const start = new Date(2024, 11, 25);
    const end = new Date(2025, 0, 5);
    expect(daysBetween(start, end)).toBe(11);
  });

  it('handles leap years correctly', () => {
    const start = new Date(2024, 1, 28); // Feb 28, 2024 (leap year)
    const end = new Date(2024, 2, 1); // Mar 1, 2024
    expect(daysBetween(start, end)).toBe(2); // Feb 29 exists
  });
});

describe('startOfWeek', () => {
  it('returns Sunday for week starting on Sunday (default)', () => {
    const date = new Date(2024, 5, 15); // Saturday, June 15
    const result = startOfWeek(date);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(9); // June 9
  });

  it('returns Monday for week starting on Monday', () => {
    const date = new Date(2024, 5, 15); // Saturday, June 15
    const result = startOfWeek(date, 1);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(10); // June 10
  });

  it('normalizes to midnight', () => {
    const date = new Date(2024, 5, 15, 14, 30);
    const result = startOfWeek(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe('endOfWeek', () => {
  it('returns Saturday for week starting on Sunday (default)', () => {
    const date = new Date(2024, 5, 15); // Saturday, June 15
    const result = endOfWeek(date);
    expect(result.getDay()).toBe(6); // Saturday
    expect(result.getDate()).toBe(15); // June 15
  });

  it('returns Sunday for week starting on Monday', () => {
    const date = new Date(2024, 5, 15); // Saturday, June 15
    const result = endOfWeek(date, 1);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(16); // June 16
  });

  it('sets time to end of day', () => {
    const date = new Date(2024, 5, 15);
    const result = endOfWeek(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});

describe('startOfMonth', () => {
  it('returns first day of month', () => {
    const date = new Date(2024, 5, 15);
    const result = startOfMonth(date);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5);
    expect(result.getFullYear()).toBe(2024);
  });

  it('normalizes to midnight', () => {
    const date = new Date(2024, 5, 15, 14, 30);
    const result = startOfMonth(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('endOfMonth', () => {
  it('returns last day of month', () => {
    const date = new Date(2024, 5, 15); // June has 30 days
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(30);
    expect(result.getMonth()).toBe(5);
  });

  it('handles months with 31 days', () => {
    const date = new Date(2024, 0, 15); // January has 31 days
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(31);
  });

  it('handles February in leap year', () => {
    const date = new Date(2024, 1, 15); // February 2024 (leap year)
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(29);
  });

  it('handles February in non-leap year', () => {
    const date = new Date(2023, 1, 15); // February 2023 (non-leap year)
    const result = endOfMonth(date);
    expect(result.getDate()).toBe(28);
  });

  it('sets time to end of day', () => {
    const date = new Date(2024, 5, 15);
    const result = endOfMonth(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});

describe('dateRange', () => {
  it('creates inclusive range', () => {
    const start = new Date(2024, 5, 1);
    const end = new Date(2024, 5, 5);
    const range = dateRange(start, end);
    expect(range).toHaveLength(5);
    expect(range[0].getDate()).toBe(1);
    expect(range[4].getDate()).toBe(5);
  });

  it('handles single day range', () => {
    const start = new Date(2024, 5, 15);
    const end = new Date(2024, 5, 15);
    const range = dateRange(start, end);
    expect(range).toHaveLength(1);
    expect(range[0].getDate()).toBe(15);
  });

  it('handles month boundaries', () => {
    const start = new Date(2024, 5, 28);
    const end = new Date(2024, 6, 3);
    const range = dateRange(start, end);
    expect(range).toHaveLength(6);
    expect(range[0].getDate()).toBe(28);
    expect(range[0].getMonth()).toBe(5); // June
    expect(range[5].getDate()).toBe(3);
    expect(range[5].getMonth()).toBe(6); // July
  });

  it('returns empty array if end before start', () => {
    const start = new Date(2024, 5, 15);
    const end = new Date(2024, 5, 10);
    const range = dateRange(start, end);
    expect(range).toHaveLength(0);
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    const today = new Date();
    expect(isToday(today)).toBe(true);
  });

  it('returns true for today at different time', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(isToday(today)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    const saturday = new Date(2024, 5, 15); // June 15, 2024 is Saturday
    expect(isWeekend(saturday)).toBe(true);
  });

  it('returns true for Sunday', () => {
    const sunday = new Date(2024, 5, 16); // June 16, 2024 is Sunday
    expect(isWeekend(sunday)).toBe(true);
  });

  it('returns false for Monday', () => {
    const monday = new Date(2024, 5, 17); // June 17, 2024 is Monday
    expect(isWeekend(monday)).toBe(false);
  });

  it('returns false for Friday', () => {
    const friday = new Date(2024, 5, 14); // June 14, 2024 is Friday
    expect(isWeekend(friday)).toBe(false);
  });
});
