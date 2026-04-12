import { describe, it, expect } from 'vitest';
import {
  parseEventDateTime,
  parseRowDateValue,
  isSameCalendarDay,
  calculateEventEndDate,
  buildCalendarEvent,
  eventSpansDate,
} from '../calendar-event-utils';

describe('parseEventDateTime', () => {
  it('parses ISO datetime strings with time information', () => {
    const row = { date: '2024-06-15T14:30:00Z' };
    const result = parseEventDateTime(row, 'date');

    expect(result).not.toBeNull();
    expect(result?.date).toBeInstanceOf(Date);
    expect(result?.hour).toBeDefined();
    expect(result?.minute).toBeDefined();
  });

  it('parses date-only strings without time information', () => {
    const row = { date: '2024-06-15' };
    const result = parseEventDateTime(row, 'date');

    expect(result).not.toBeNull();
    expect(result?.date).toBeInstanceOf(Date);
    expect(result?.hour).toBeUndefined();
    expect(result?.minute).toBeUndefined();
  });

  it('extracts correct hour and minute from datetime', () => {
    const row = { date: '2024-06-15T14:30:00' };
    const result = parseEventDateTime(row, 'date');

    expect(result?.hour).toBe(14);
    expect(result?.minute).toBe(30);
  });

  it('returns null for missing field', () => {
    const row = { otherField: 'value' };
    const result = parseEventDateTime(row, 'date');

    expect(result).toBeNull();
  });

  it('returns null for invalid date', () => {
    const row = { date: 'invalid' };
    const result = parseEventDateTime(row, 'date');

    expect(result).toBeNull();
  });

  it('returns null when fieldId is undefined', () => {
    const row = { date: '2024-06-15' };
    const result = parseEventDateTime(row, undefined);

    expect(result).toBeNull();
  });

  it('handles midnight correctly', () => {
    const row = { date: '2024-06-15T00:00:00' };
    const result = parseEventDateTime(row, 'date');

    expect(result?.hour).toBe(0);
    expect(result?.minute).toBe(0);
  });

  it('handles edge times correctly', () => {
    const row = { date: '2024-06-15T23:59:00' };
    const result = parseEventDateTime(row, 'date');

    expect(result?.hour).toBe(23);
    expect(result?.minute).toBe(59);
  });
});

describe('parseRowDateValue', () => {
  it('parses valid date string', () => {
    const row = { date: '2024-06-15' };
    const result = parseRowDateValue(row, 'date');

    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(5); // 0-indexed
    expect(result?.getDate()).toBe(15);
  });

  it('returns null for missing field', () => {
    const row = {};
    const result = parseRowDateValue(row, 'date');

    expect(result).toBeNull();
  });

  it('returns null for invalid date', () => {
    const row = { date: 'invalid' };
    const result = parseRowDateValue(row, 'date');

    expect(result).toBeNull();
  });

  it('returns null when fieldId is undefined', () => {
    const row = { date: '2024-06-15' };
    const result = parseRowDateValue(row, undefined);

    expect(result).toBeNull();
  });
});

describe('isSameCalendarDay', () => {
  it('returns true for same day with different times', () => {
    const d1 = new Date(2024, 5, 15, 10, 0);
    const d2 = new Date(2024, 5, 15, 18, 30);

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

describe('calculateEventEndDate', () => {
  it('calculates end date for whole day durations', () => {
    const startDate = new Date(2024, 5, 15);
    const endDate = calculateEventEndDate(startDate, 3);

    expect(endDate.getDate()).toBe(17); // 15 + (3-1) = 17
    expect(endDate.getMonth()).toBe(5);
  });

  it('floors fractional durations', () => {
    const startDate = new Date(2024, 5, 15);
    const endDate = calculateEventEndDate(startDate, 2.7);

    expect(endDate.getDate()).toBe(16); // 15 + floor(2.7 - 1) = 15 + 1
  });

  it('handles single day events (duration = 1)', () => {
    const startDate = new Date(2024, 5, 15);
    const endDate = calculateEventEndDate(startDate, 1);

    expect(endDate.getDate()).toBe(15); // Single day = same date
    expect(endDate.getMonth()).toBe(5);
  });

  it('handles month boundaries', () => {
    const startDate = new Date(2024, 5, 28);
    const endDate = calculateEventEndDate(startDate, 5);

    expect(endDate.getDate()).toBe(2); // 28 + (5-1) = 32 → July 2
    expect(endDate.getMonth()).toBe(6); // July
  });
});

describe('buildCalendarEvent', () => {
  it('builds event with duration', () => {
    const row = { date: '2024-06-15', duration: 3, title: 'Event' };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');

    expect(event).not.toBeNull();
    expect(event?.duration).toBe(3);
    expect(event?.endDate).toBeDefined();
    expect(event?.endDate?.getDate()).toBe(17); // 15 + (3-1) = 17
  });

  it('defaults duration to 1 when no duration field', () => {
    const row = { date: '2024-06-15', title: 'Event' };
    const event = buildCalendarEvent(row, 0, 'date', undefined);

    expect(event).not.toBeNull();
    expect(event?.duration).toBe(1);
  });

  it('defaults duration to 1 when duration field has invalid value', () => {
    const row = { date: '2024-06-15', duration: 'invalid', title: 'Event' };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');

    expect(event).not.toBeNull();
    expect(event?.duration).toBe(1);
  });

  it('includes time information when available', () => {
    const row = { date: '2024-06-15T14:30:00', duration: 2 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');

    expect(event?.hour).toBe(14);
    expect(event?.minute).toBe(30);
  });

  it('returns null for invalid date', () => {
    const row = { date: 'invalid', duration: 3 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');

    expect(event).toBeNull();
  });
});

describe('eventSpansDate', () => {
  it('returns true for single-day event on same day', () => {
    const row = { date: '2024-06-15', duration: 1 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');
    const checkDate = new Date(2024, 5, 15);
    const startDate = new Date(2024, 5, 15);

    expect(event).not.toBeNull();
    expect(eventSpansDate(event!, checkDate, startDate)).toBe(true);
  });

  it('returns false for single-day event on different day', () => {
    const row = { date: '2024-06-15', duration: 1 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');
    const checkDate = new Date(2024, 5, 16);
    const startDate = new Date(2024, 5, 15);

    expect(event).not.toBeNull();
    expect(eventSpansDate(event!, checkDate, startDate)).toBe(false);
  });

  it('returns true for multi-day event within range', () => {
    const row = { date: '2024-06-15', duration: 3 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');
    const startDate = new Date(2024, 5, 15);

    // Check day 2 of 3-day event
    const checkDate = new Date(2024, 5, 16);

    expect(event).not.toBeNull();
    expect(eventSpansDate(event!, checkDate, startDate)).toBe(true);
  });

  it('returns true for last day of multi-day event', () => {
    const row = { date: '2024-06-15', duration: 3 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');
    const startDate = new Date(2024, 5, 15);

    // Check last day (15 + (3-1) = 17)
    const checkDate = new Date(2024, 5, 17);

    expect(event).not.toBeNull();
    expect(eventSpansDate(event!, checkDate, startDate)).toBe(true);
  });

  it('returns false for date after multi-day event', () => {
    const row = { date: '2024-06-15', duration: 3 };
    const event = buildCalendarEvent(row, 0, 'date', 'duration');
    const startDate = new Date(2024, 5, 15);

    // Check day after event ends (18 is after 17)
    const checkDate = new Date(2024, 5, 18);

    expect(event).not.toBeNull();
    expect(eventSpansDate(event!, checkDate, startDate)).toBe(false);
  });
});
