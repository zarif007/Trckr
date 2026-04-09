import {
  badRequest,
  jsonOk,
  notFound,
  readParams,
  requireParam,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { NodeType } from "@prisma/client";

type GridIdSlugPair = { id: string; slug: string };

/**
 * POST /api/trackers/[id]/branches/[branchId]/merge
 * Merge a branch into main by replacing main rows with branch rows.
 * Marks the source branch rows as isMerged = true.
 *
 * Returns `{ merged, main }` where `main` is the updated main branch
 * in BranchRecord shape for the UI.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; branchId: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id, branchId } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  const branchName = requireParam(branchId, "branch name");
  if (!trackerId) return badRequest("Missing tracker id");
  if (!branchName) return badRequest("Missing branch name");

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      versionControl: true,
      schemaVersion: true,
      nodes: { where: { type: NodeType.GRID }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");
  if (!tracker.versionControl)
    return badRequest("Version control is not enabled for this tracker");

  if (branchName === "main")
    return badRequest("Cannot merge main into itself");

  // SECURITY FIX: Fetch branch rows inside transaction to prevent race condition
  await prisma.$transaction(async (tx) => {
    const branchRows = await tx.gridRow.findMany({
      where: {
        trackerId,
        branchName,
        isMerged: false,
        deletedAt: null,
      },
    });
    if (branchRows.length === 0) {
      throw new Error("Branch not found or empty");
    }

    await tx.gridRow.deleteMany({
      where: { trackerId, branchName: "main" },
    });

    await tx.gridRow.createMany({
      data: branchRows.map((row) => ({
        trackerId: row.trackerId,
        gridId: row.gridId,
        data: row.data ?? {},
        schemaVersion: row.schemaVersion,
        version: row.version + 1,
        statusTag: row.statusTag,
        sortOrder: row.sortOrder,
        branchName: "main",
        isMerged: false,
        createdBy: authResult.user.id,
      })),
    });

    await tx.gridRow.updateMany({
      where: { trackerId, branchName },
      data: { isMerged: true },
    });
  }).catch((error) => {
    if (error.message === "Branch not found or empty") {
      return notFound("Branch not found or empty");
    }
    throw error;
  });

  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));

  const mainRows = await prisma.gridRow.findMany({
    where: { trackerId, branchName: "main", deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  const mainData: Record<string, Array<Record<string, unknown>>> = {};
  for (const row of mainRows) {
    const gridSlug = gridIdToSlug.get(row.gridId) ?? row.gridId;
    if (!mainData[gridSlug]) mainData[gridSlug] = [];
    mainData[gridSlug].push({
      ...(row.data as Record<string, unknown>),
      _rowId: row.id,
      _sortOrder: row.sortOrder,
    });
  }

  const latestRow = mainRows.length > 0 ? mainRows[mainRows.length - 1] : null;

  return jsonOk({
    merged: { branchName },
    main: {
      id: "main",
      branchName: "main",
      label: "main",
      data: mainData,
      updatedAt: latestRow?.updatedAt?.toISOString() ?? new Date().toISOString(),
      formStatus: latestRow?.statusTag ?? null,
      author: latestRow?.createdByUser ?? null,
      rowCount: mainRows.length,
      isMerged: false,
    },
  });
}
