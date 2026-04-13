import type { CSSProperties } from "react";
import { z } from "zod";
import { rowPayloadForPatch } from "./row-utils";

/** Client row objects carry accent on this key (mirrors DB `rowAccentHex`). */
export const ROW_ACCENT_HEX_CLIENT_KEY = "_rowAccentHex" as const;

export type PatchTrackerDataRowBody = {
  data: Record<string, unknown>;
  rowAccentHex?: string | null;
};

/**
 * Builds `{ data, rowAccentHex? }` for PATCH `/api/trackers/.../data/:rowId`.
 * Omits `rowAccentHex` when the merged row has no `_rowAccentHex` property (no server update).
 */
export function buildPatchTrackerRowRequestBody(
  mergedRow: Record<string, unknown>,
): PatchTrackerDataRowBody {
  const data = rowPayloadForPatch(mergedRow);
  if (!Object.prototype.hasOwnProperty.call(mergedRow, ROW_ACCENT_HEX_CLIENT_KEY)) {
    return { data };
  }
  const raw = mergedRow[ROW_ACCENT_HEX_CLIENT_KEY];
  if (raw === null) return { data, rowAccentHex: null };
  return { data, rowAccentHex: parseRowAccentHex(raw) };
}

const ROW_HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function expandShorthandToSixDigits(hex: string): string {
  const m = hex.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const body = m[1]!;
  if (body.length === 3) {
    const [a, b, c] = body;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return `#${body.toLowerCase()}`;
}

/**
 * Returns normalized `#rrggbb`, or `null` if value is empty / invalid.
 * Use `undefined` only when the caller should mean "omit" (not passed).
 */
export function parseRowAccentHex(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!ROW_HEX_RE.test(t)) return null;
  return expandShorthandToSixDigits(t);
}

export function isValidRowAccentHex(value: unknown): value is string {
  return parseRowAccentHex(value) !== null;
}

/** Zod schema for API bodies: optional clear with null, normalize strings. */
export const rowAccentHexBodySchema = z
  .union([
    z
      .string()
      .trim()
      .regex(ROW_HEX_RE, "Expected #rgb or #rrggbb")
      .transform((s) => expandShorthandToSixDigits(s)),
    z.null(),
  ])
  .optional();

/** Wide rows/cards: soft fill + strong left stripe. Narrow chips: stronger tint + blended border. */
export type RowAccentVisualKind = "strip" | "chip";

function rowAccentTintBackground(hex: string, tintPercent: number): string {
  return `color-mix(in srgb, ${hex} ${tintPercent}%, hsl(var(--card)))`;
}

function rowAccentBorderBlend(hex: string, accentPercent: number): string {
  return `color-mix(in srgb, ${hex} ${accentPercent}%, hsl(var(--border)))`;
}

/**
 * Inline styles for a validated row accent. Invalid / missing accent returns `undefined`.
 *
 * - `strip` (default): subtle `color-mix` fill + 3px left bar (table, kanban).
 * - `chip`: stronger tint + blended border color (calendar pills, timeline bars).
 */
export function rowAccentStyleFromRow(
  row: Record<string, unknown> | undefined,
  kind: RowAccentVisualKind = "strip",
): CSSProperties | undefined {
  const raw = row?.[ROW_ACCENT_HEX_CLIENT_KEY];
  const hex = parseRowAccentHex(raw);
  if (!hex) return undefined;

  if (kind === "chip") {
    return {
      backgroundColor: rowAccentTintBackground(hex, 38),
      borderColor: rowAccentBorderBlend(hex, 50),
    };
  }

  return {
    backgroundColor: rowAccentTintBackground(hex, 17),
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: hex,
  };
}
