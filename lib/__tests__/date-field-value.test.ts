import { describe, expect, it } from "vitest";
import {
  formatDateFieldCalendarDay,
  parseDateFieldStoredValue,
} from "../date-field-value";

describe("parseDateFieldStoredValue", () => {
  it("parses YYYY-MM-DD at local midnight", () => {
    const d = parseDateFieldStoredValue("2024-06-15");
    expect(d).toBeDefined();
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
    expect(formatDateFieldCalendarDay(d!)).toBe("2024-06-15");
  });

  it("maps legacy UTC-midnight ISO to the same calendar day string (local)", () => {
    const d = parseDateFieldStoredValue("2024-06-15T00:00:00.000Z");
    expect(d).toBeDefined();
    expect(formatDateFieldCalendarDay(d!)).toBe("2024-06-15");
  });
});
