import "server-only";

import { prisma } from "@/lib/db";

import { buildTrackerDataWhere, type TrackerDataInput } from "./query-executor";
import { needsMultiFairPoolForAggregates } from "./multi-load-policy";
import type { QueryPlanV1 } from "./schemas";

/** Above this many distinct instance buckets, skip per-bucket queries unless a fair pool is required for global sums. */
const FAIR_MULTI_MAX_LABEL_BUCKETS = 128;

/** Cap concurrent per-bucket reads when using the fair path (many buckets). */
const MULTI_LABEL_FETCH_CONCURRENCY = 48;

const gridRowSelect = {
  id: true,
  gridId: true,
  data: true,
  statusTag: true,
  sortOrder: true,
  branchName: true,
  createdAt: true,
  updatedAt: true,
} as const;

type GridRowLoadRow = {
  id: string;
  gridId: string;
  data: unknown;
  statusTag: string | null;
  sortOrder: number;
  branchName: string;
  createdAt: Date;
  updatedAt: Date;
};

function buildTrackerDataInputFromGridRows(
  rows: GridRowLoadRow[],
  gridIdToSlug: Map<string, string>,
  label: string | null,
): TrackerDataInput {
  const bySlug = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const slug = gridIdToSlug.get(r.gridId) ?? r.gridId;
    const list = bySlug.get(slug) ?? [];
    list.push({
      ...(typeof r.data === "object" && r.data !== null
        ? (r.data as Record<string, unknown>)
        : {}),
      _rowId: r.id,
      _sortOrder: r.sortOrder,
    });
    bySlug.set(slug, list);
  }
  for (const [, arr] of bySlug) {
    arr.sort(
      (a, b) =>
        (Number(a._sortOrder) || 0) - (Number(b._sortOrder) || 0),
    );
  }
  const data: Record<string, unknown> = Object.fromEntries(bySlug);
  const oldestCreated = rows.reduce(
    (min, r) => (r.createdAt < min ? r.createdAt : min),
    rows[0]!.createdAt,
  );
  const newestUpdated = rows.reduce(
    (max, r) => (r.updatedAt > max ? r.updatedAt : max),
    rows[0]!.updatedAt,
  );
  return {
    id: rows[0]!.id,
    label,
    branchName: rows[0]!.branchName,
    createdAt: oldestCreated,
    updatedAt: newestUpdated,
    data,
  };
}

/**
 * Load grid row sets for a validated query plan: fair per-bucket quota for MULTI trackers,
 * otherwise newest-first up to the plan cap on grid rows.
 *
 * Grid rows are grouped into logical `TrackerDataInput` documents (one per MULTI `statusTag`
 * bucket, or a single merged document for SINGLE) so downstream `executeQueryPlan` is unchanged.
 */
export async function loadTrackerDataForQueryPlan(params: {
  trackerSchemaId: string;
  plan: QueryPlanV1;
  trackerInstance: "SINGLE" | "MULTI";
}): Promise<TrackerDataInput[]> {
  const { trackerSchemaId, plan, trackerInstance } = params;
  const baseWhere = buildTrackerDataWhere(trackerSchemaId, plan.load);
  const max = plan.load.maxTrackerDataRows;

  const gridNodes = await prisma.trackerNode.findMany({
    where: { trackerId: trackerSchemaId, type: "GRID" },
    select: { id: true, slug: true },
  });
  const gridIdToSlug = new Map(gridNodes.map((n) => [n.id, n.slug]));

  if (trackerInstance !== "MULTI") {
    const rows = await prisma.gridRow.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      take: max,
      select: gridRowSelect,
    });
    if (rows.length === 0) return [];
    return [
      buildTrackerDataInputFromGridRows(rows, gridIdToSlug, null),
    ];
  }

  const groups = await prisma.gridRow.groupBy({
    by: ["statusTag"],
    where: baseWhere,
    _count: { _all: true },
  });

  if (groups.length === 0) {
    return [];
  }

  const useFairPerLabel =
    groups.length <= FAIR_MULTI_MAX_LABEL_BUCKETS ||
    needsMultiFairPoolForAggregates(plan);

  if (!useFairPerLabel) {
    const rows = await prisma.gridRow.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      take: max,
      select: gridRowSelect,
    });
    if (rows.length === 0) return [];
    return [
      buildTrackerDataInputFromGridRows(rows, gridIdToSlug, null),
    ];
  }

  const quota = Math.max(1, Math.floor(max / groups.length));
  const merged: GridRowLoadRow[] = [];

  for (let i = 0; i < groups.length; i += MULTI_LABEL_FETCH_CONCURRENCY) {
    const chunk = groups.slice(i, i + MULTI_LABEL_FETCH_CONCURRENCY);
    const slices = await Promise.all(
      chunk.map((g) =>
        prisma.gridRow.findMany({
          where: {
            ...baseWhere,
            statusTag: g.statusTag === null ? null : g.statusTag,
          },
          orderBy: { updatedAt: "desc" },
          take: quota,
          select: gridRowSelect,
        }),
      ),
    );
    merged.push(...slices.flat());
  }

  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const capped =
    merged.length > max ? merged.slice(0, max) : merged;

  const byLabel = new Map<string | null, GridRowLoadRow[]>();
  for (const row of capped) {
    const key = row.statusTag;
    const list = byLabel.get(key) ?? [];
    list.push(row);
    byLabel.set(key, list);
  }

  const inputs: TrackerDataInput[] = [];
  for (const [tag, bucketRows] of byLabel) {
    if (bucketRows.length === 0) continue;
    inputs.push(
      buildTrackerDataInputFromGridRows(bucketRows, gridIdToSlug, tag),
    );
  }
  inputs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return inputs;
}
