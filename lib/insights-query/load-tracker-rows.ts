import 'server-only'

import { prisma } from '@/lib/db'

import { buildTrackerDataWhere, type TrackerDataInput } from './query-executor'
import type { QueryPlanV1 } from './schemas'

const FAIR_MULTI_MAX_LABEL_BUCKETS = 128

function mapPrismaTrackerDataRow(r: {
  id: string
  label: string | null
  branchName: string
  createdAt: Date
  updatedAt: Date
  data: unknown
}): TrackerDataInput {
  return {
    id: r.id,
    label: r.label,
    branchName: r.branchName,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    data: r.data as Record<string, unknown>,
  }
}

/**
 * Load `TrackerData` rows for a validated query plan: fair per-label quota for MULTI trackers,
 * otherwise newest-first up to the plan cap.
 */
export async function loadTrackerDataForQueryPlan(params: {
  trackerSchemaId: string
  plan: QueryPlanV1
  trackerInstance: 'SINGLE' | 'MULTI'
}): Promise<TrackerDataInput[]> {
  const { trackerSchemaId, plan, trackerInstance } = params
  const where = buildTrackerDataWhere(trackerSchemaId, plan.load)
  const max = plan.load.maxTrackerDataRows
  const select = {
    id: true,
    label: true,
    branchName: true,
    createdAt: true,
    updatedAt: true,
    data: true,
  } as const

  if (trackerInstance !== 'MULTI') {
    const rows = await prisma.trackerData.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: max,
      select,
    })
    return rows.map(mapPrismaTrackerDataRow)
  }

  const groups = await prisma.trackerData.groupBy({
    by: ['label'],
    where,
    _count: { _all: true },
  })

  if (groups.length === 0) {
    return []
  }

  if (groups.length > FAIR_MULTI_MAX_LABEL_BUCKETS) {
    const rows = await prisma.trackerData.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: max,
      select,
    })
    return rows.map(mapPrismaTrackerDataRow)
  }

  const quota = Math.max(1, Math.floor(max / groups.length))
  const slices = await Promise.all(
    groups.map((g) =>
      prisma.trackerData.findMany({
        where: { ...where, label: g.label },
        orderBy: { updatedAt: 'desc' },
        take: quota,
        select,
      }),
    ),
  )
  let merged = slices.flat()
  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  if (merged.length > max) {
    merged = merged.slice(0, max)
  }
  return merged.map(mapPrismaTrackerDataRow)
}
