import "server-only";

import { prisma } from "@/lib/db";

import { buildTrackerDataWhere, type TrackerDataInput } from "./query-executor";
import { needsMultiFairPoolForAggregates } from "./multi-load-policy";
import type { QueryPlanV1 } from "./schemas";

/** Above this many distinct instance labels, skip per-label queries unless a fair pool is required for global sums. */
const FAIR_MULTI_MAX_LABEL_BUCKETS = 128;

/** Cap concurrent per-label reads when using the fair path (many labels). */
const MULTI_LABEL_FETCH_CONCURRENCY = 48;

function mapPrismaTrackerDataRow(r: {
  id: string;
  label: string | null;
  branchName: string;
  createdAt: Date;
  updatedAt: Date;
  data: unknown;
}): TrackerDataInput {
  return {
    id: r.id,
    label: r.label,
    branchName: r.branchName,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    data: r.data as Record<string, unknown>,
  };
}

/**
 * Load `TrackerData` rows for a validated query plan: fair per-label quota for MULTI trackers,
 * otherwise newest-first up to the plan cap.
 *
 * Fair per-label quotas bound work when many instances exist; **global sum/avg** with empty
 * `aggregate.groupBy` uses the fair path even with many labels so pooled totals are not
 * biased to the globally newest instances only.
 */
export async function loadTrackerDataForQueryPlan(params: {
  trackerSchemaId: string;
  plan: QueryPlanV1;
  trackerInstance: "SINGLE" | "MULTI";
}): Promise<TrackerDataInput[]> {
  const { trackerSchemaId, plan, trackerInstance } = params;
  const where = buildTrackerDataWhere(trackerSchemaId, plan.load);
  const max = plan.load.maxTrackerDataRows;
  const select = {
    id: true,
    label: true,
    branchName: true,
    createdAt: true,
    updatedAt: true,
    data: true,
  } as const;

  if (trackerInstance !== "MULTI") {
    const rows = await prisma.trackerData.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: max,
      select,
    });
    return rows.map(mapPrismaTrackerDataRow);
  }

  const groups = await prisma.trackerData.groupBy({
    by: ["label"],
    where,
    _count: { _all: true },
  });

  if (groups.length === 0) {
    return [];
  }

  const useFairPerLabel =
    groups.length <= FAIR_MULTI_MAX_LABEL_BUCKETS ||
    needsMultiFairPoolForAggregates(plan);

  if (!useFairPerLabel) {
    const rows = await prisma.trackerData.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: max,
      select,
    });
    return rows.map(mapPrismaTrackerDataRow);
  }

  const quota = Math.max(1, Math.floor(max / groups.length));
  const merged: Array<{
    id: string;
    label: string | null;
    branchName: string;
    createdAt: Date;
    updatedAt: Date;
    data: unknown;
  }> = [];

  for (let i = 0; i < groups.length; i += MULTI_LABEL_FETCH_CONCURRENCY) {
    const chunk = groups.slice(i, i + MULTI_LABEL_FETCH_CONCURRENCY);
    const slices = await Promise.all(
      chunk.map((g) =>
        prisma.trackerData.findMany({
          where: { ...where, label: g.label },
          orderBy: { updatedAt: "desc" },
          take: quota,
          select,
        }),
      ),
    );
    merged.push(...slices.flat());
  }

  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const capped = merged.length > max ? merged.slice(0, max) : merged;
  return capped.map(mapPrismaTrackerDataRow);
}
