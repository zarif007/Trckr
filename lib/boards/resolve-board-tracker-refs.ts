import "server-only";

import { NodeType } from "@prisma/client";

import { prisma } from "@/lib/db";

function fieldLabelFromRow(slug: string, ui: unknown): string {
  const label = (ui as Record<string, unknown> | undefined)?.label;
  return typeof label === "string" && label.trim() !== ""
    ? label.trim()
    : slug;
}

/**
 * Board definitions store assembled tracker `grid.id` / `field.id` values, which
 * are node/field **slugs**. Prisma relations (`GridRow.gridId`, layout FKs)
 * use internal **cuid** ids. Resolve slug-or-id to the internal grid row id.
 */
export async function resolveBoardGridInternalId(
  trackerId: string,
  gridIdOrSlug: string,
): Promise<string | null> {
  const node = await prisma.trackerNode.findFirst({
    where: {
      trackerId,
      type: NodeType.GRID,
      OR: [{ id: gridIdOrSlug }, { slug: gridIdOrSlug }],
    },
    select: { id: true },
  });
  return node?.id ?? null;
}

/**
 * `GridRow.data` keys follow assembled field ids (slugs). Accept either slug
 * or internal field id and return the slug key used in row JSON.
 */
export async function resolveBoardFieldDataKey(
  trackerId: string,
  fieldIdOrSlug: string,
): Promise<string | null> {
  const field = await prisma.trackerField.findFirst({
    where: {
      trackerId,
      OR: [{ id: fieldIdOrSlug }, { slug: fieldIdOrSlug }],
    },
    select: { slug: true },
  });
  return field?.slug ?? null;
}

/** Map field id or slug → `GridRow.data` key (field slug). */
export async function resolveBoardFieldDataKeyMap(
  trackerId: string,
  refs: string[],
): Promise<Map<string, string>> {
  const uniq = [...new Set(refs.filter((r) => r.length > 0))];
  if (uniq.length === 0) return new Map();

  const fields = await prisma.trackerField.findMany({
    where: {
      trackerId,
      OR: [{ id: { in: uniq } }, { slug: { in: uniq } }],
    },
    select: { id: true, slug: true },
  });

  const out = new Map<string, string>();
  for (const f of fields) {
    out.set(f.id, f.slug);
    out.set(f.slug, f.slug);
  }
  return out;
}

export async function buildBoardFieldLabelMap(
  trackerId: string,
  fieldRefs: string[],
): Promise<Map<string, string>> {
  const uniq = [...new Set(fieldRefs.filter((x) => x.length > 0))];
  if (uniq.length === 0) return new Map();

  const fields = await prisma.trackerField.findMany({
    where: {
      trackerId,
      OR: [{ id: { in: uniq } }, { slug: { in: uniq } }],
    },
    select: { id: true, slug: true, ui: true },
  });

  const out = new Map<string, string>();
  for (const f of fields) {
    const label = fieldLabelFromRow(f.slug, f.ui);
    out.set(f.id, label);
    out.set(f.slug, label);
  }
  return out;
}
