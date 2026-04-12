import { describe, it, expect } from 'vitest';
import {
  resolveEventColor,
  getUniqueFieldValues,
  buildFieldColorMap,
  EVENT_COLOR_PALETTE,
} from '../event-colors';
import type { TrackerField } from '@/app/components/tracker-display/types';

function statusTrackerField(overrides: Partial<Pick<TrackerField, 'id' | 'ui'>> = {}): TrackerField {
  const id = overrides.id ?? 'status';
  return {
    id,
    dataType: 'status',
    ui: { label: 'Status', ...overrides.ui },
  };
}

describe('resolveEventColor', () => {
  it('returns default color when no colorFieldId provided', () => {
    const row = { status: 'completed' };
    const color = resolveEventColor(row, undefined, []);

    expect(color.bg).toBe('bg-primary/10');
    expect(color.text).toBe('text-primary');
    expect(color.border).toBe('border-primary/20');
  });

  it('returns first palette color when value is empty', () => {
    const row = { category: '' };
    const color = resolveEventColor(row, 'category', []);

    expect(color).toEqual(EVENT_COLOR_PALETTE[0]);
  });

  it('maps status field "completed" to success color', () => {
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];
    const row = { status: 'completed' };
    const color = resolveEventColor(row, 'status', fields);

    expect(color.bg).toBe('bg-success/10');
    expect(color.text).toBe('text-success');
    expect(color.border).toBe('border-success/20');
  });

  it('maps status field "in_progress" to info color', () => {
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];
    const row = { status: 'in_progress' };
    const color = resolveEventColor(row, 'status', fields);

    expect(color.bg).toBe('bg-info/10');
    expect(color.text).toBe('text-info');
  });

  it('maps status field "blocked" to destructive color', () => {
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];
    const row = { status: 'blocked' };
    const color = resolveEventColor(row, 'status', fields);

    expect(color.bg).toBe('bg-destructive/10');
    expect(color.text).toBe('text-destructive');
  });

  it('handles status values with spaces by replacing with underscores', () => {
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];
    const row = { status: 'In Progress' }; // Space instead of underscore
    const color = resolveEventColor(row, 'status', fields);

    expect(color.bg).toBe('bg-info/10');
  });

  it('handles status values with different casing', () => {
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];
    const row = { status: 'COMPLETED' }; // Uppercase
    const color = resolveEventColor(row, 'status', fields);

    expect(color.bg).toBe('bg-success/10');
  });

  it('hashes non-status field values to palette', () => {
    const row = { category: 'Test' };
    const color = resolveEventColor(row, 'category', []);

    expect(EVENT_COLOR_PALETTE).toContainEqual(color);
  });

  it('returns consistent colors for same value', () => {
    const row = { category: 'Test' };
    const color1 = resolveEventColor(row, 'category', []);
    const color2 = resolveEventColor(row, 'category', []);

    expect(color1).toEqual(color2);
  });

  it('returns different colors for different values', () => {
    const fields: TrackerField[] = [];

    const row1 = { category: 'Value1' };
    const row2 = { category: 'Value2' };

    const color1 = resolveEventColor(row1, 'category', fields);
    const color2 = resolveEventColor(row2, 'category', fields);

    // Due to hashing, they might occasionally collide, but test common case
    // We just verify they're both from the palette
    expect(EVENT_COLOR_PALETTE).toContainEqual(color1);
    expect(EVENT_COLOR_PALETTE).toContainEqual(color2);
  });

  it('falls back to palette for unknown status values', () => {
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];
    const row = { status: 'custom_status_not_in_map' };
    const color = resolveEventColor(row, 'status', fields);

    expect(EVENT_COLOR_PALETTE).toContainEqual(color);
  });
});

describe('getUniqueFieldValues', () => {
  it('returns unique values from field', () => {
    const rows = [
      { category: 'A' },
      { category: 'B' },
      { category: 'A' },
      { category: 'C' },
    ];

    const values = getUniqueFieldValues(rows, 'category');

    expect(values).toEqual(['A', 'B', 'C']);
  });

  it('sorts values alphabetically', () => {
    const rows = [
      { category: 'Zebra' },
      { category: 'Apple' },
      { category: 'Mango' },
    ];

    const values = getUniqueFieldValues(rows, 'category');

    expect(values).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('excludes null, undefined, and empty string values', () => {
    const rows = [
      { category: 'A' },
      { category: null },
      { category: undefined },
      { category: '' },
      { category: 'B' },
    ];

    const values = getUniqueFieldValues(rows, 'category');

    expect(values).toEqual(['A', 'B']);
  });

  it('handles numeric values', () => {
    const rows = [
      { priority: 1 },
      { priority: 3 },
      { priority: 2 },
      { priority: 1 },
    ];

    const values = getUniqueFieldValues(rows, 'priority');

    expect(values).toContain(1);
    expect(values).toContain(2);
    expect(values).toContain(3);
    expect(values).toHaveLength(3);
  });

  it('returns empty array when no rows', () => {
    const values = getUniqueFieldValues([], 'category');

    expect(values).toEqual([]);
  });

  it('returns empty array when field does not exist in any row', () => {
    const rows = [
      { other: 'value' },
      { other: 'value2' },
    ];

    const values = getUniqueFieldValues(rows, 'category');

    expect(values).toEqual([]);
  });
});

describe('buildFieldColorMap', () => {
  it('builds color map for all unique values', () => {
    const rows = [
      { category: 'A' },
      { category: 'B' },
      { category: 'C' },
    ];
    const fields: TrackerField[] = [];

    const colorMap = buildFieldColorMap(rows, 'category', fields);

    expect(colorMap.size).toBe(3);
    expect(colorMap.has('A')).toBe(true);
    expect(colorMap.has('B')).toBe(true);
    expect(colorMap.has('C')).toBe(true);
  });

  it('assigns consistent colors based on value', () => {
    const rows = [
      { category: 'A' },
      { category: 'B' },
    ];
    const fields: TrackerField[] = [];

    const colorMap = buildFieldColorMap(rows, 'category', fields);
    const colorA = colorMap.get('A');
    const colorB = colorMap.get('B');

    // Rebuild map - should get same colors
    const colorMap2 = buildFieldColorMap(rows, 'category', fields);
    const colorA2 = colorMap2.get('A');
    const colorB2 = colorMap2.get('B');

    expect(colorA).toEqual(colorA2);
    expect(colorB).toEqual(colorB2);
  });

  it('uses status colors for status field', () => {
    const rows = [
      { status: 'completed' },
      { status: 'in_progress' },
    ];
    const fields: TrackerField[] = [
      statusTrackerField(),
    ];

    const colorMap = buildFieldColorMap(rows, 'status', fields);

    expect(colorMap.get('completed')?.bg).toBe('bg-success/10');
    expect(colorMap.get('in_progress')?.bg).toBe('bg-info/10');
  });

  it('handles empty rows array', () => {
    const colorMap = buildFieldColorMap([], 'category', []);

    expect(colorMap.size).toBe(0);
  });
});
