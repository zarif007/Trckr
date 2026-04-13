import { describe, expect, it } from "vitest";
import {
  ROW_ACCENT_HEX_CLIENT_KEY,
  buildPatchTrackerRowRequestBody,
  parseRowAccentHex,
  rowAccentStyleFromRow,
} from "../row-accent-hex";

describe("parseRowAccentHex", () => {
  it("normalizes 3-digit hex", () => {
    expect(parseRowAccentHex("#aBc")).toBe("#aabbcc");
  });

  it("normalizes 6-digit hex", () => {
    expect(parseRowAccentHex("#1A2b3C")).toBe("#1a2b3c");
  });

  it("returns null for empty or invalid", () => {
    expect(parseRowAccentHex(null)).toBeNull();
    expect(parseRowAccentHex("")).toBeNull();
    expect(parseRowAccentHex("#gg0000")).toBeNull();
    expect(parseRowAccentHex("red")).toBeNull();
  });
});

describe("buildPatchTrackerRowRequestBody", () => {
  it("omits rowAccentHex when merged row has no accent property", () => {
    expect(buildPatchTrackerRowRequestBody({ title: "x", _rowId: "1" })).toEqual({
      data: { title: "x" },
    });
  });

  it("includes normalized rowAccentHex when set", () => {
    expect(
      buildPatchTrackerRowRequestBody({
        title: "x",
        [ROW_ACCENT_HEX_CLIENT_KEY]: "#f00",
      }),
    ).toEqual({
      data: { title: "x" },
      rowAccentHex: "#ff0000",
    });
  });

  it("sends null to clear accent", () => {
    expect(
      buildPatchTrackerRowRequestBody({
        [ROW_ACCENT_HEX_CLIENT_KEY]: null,
      }),
    ).toEqual({
      data: {},
      rowAccentHex: null,
    });
  });
});

describe("rowAccentStyleFromRow", () => {
  it("returns undefined when accent missing or invalid", () => {
    expect(rowAccentStyleFromRow(undefined)).toBeUndefined();
    expect(rowAccentStyleFromRow({})).toBeUndefined();
    expect(
      rowAccentStyleFromRow({ [ROW_ACCENT_HEX_CLIENT_KEY]: "#gg0000" }),
    ).toBeUndefined();
  });

  it("strip: color-mix fill and left bar", () => {
    const style = rowAccentStyleFromRow(
      { [ROW_ACCENT_HEX_CLIENT_KEY]: "#336699" },
      "strip",
    );
    expect(style?.backgroundColor).toContain("#336699");
    expect(style?.backgroundColor).toContain("color-mix");
    expect(style?.borderLeftWidth).toBe(3);
    expect(style?.borderLeftStyle).toBe("solid");
    expect(style?.borderLeftColor).toBe("#336699");
  });

  it("chip: tint and border blend without left bar", () => {
    const style = rowAccentStyleFromRow(
      { [ROW_ACCENT_HEX_CLIENT_KEY]: "#abc" },
      "chip",
    );
    expect(style?.backgroundColor).toContain("color-mix");
    expect(style?.borderColor).toContain("color-mix");
    expect(style?.borderLeftWidth).toBeUndefined();
  });
});
