import { z } from "zod";
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

const createBranchBodySchema = z.object({
  branchName: z.string().min(1),
  basedOnBranch: z.string().optional(),
  basedOnId: z.string().optional(),
  label: z.string().optional(),
});

type GridIdSlugPair = { id: string; slug: string };

/**
 * GET /api/trackers/[id]/branches
 * List all branches with their data for a version-controlled tracker.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  if (!trackerId) return badRequest("Missing tracker id");

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      versionControl: true,
      nodes: { where: { type: NodeType.GRID }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");
  if (!tracker.versionControl)
    return badRequest("Version control is not enabled for this tracker");

  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));

  const allRows = await prisma.gridRow.findMany({
    where: { trackerId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  const branchMap = new Map<
    string,
    {
      branchName: string;
      isMerged: boolean;
      data: Record<string, Array<Record<string, unknown>>>;
      rowCount: number;
      latestUpdatedAt: Date;
      statusTag: string | null;
      author: { id: string; name: string | null; email: string | null } | null;
    }
  >();

  for (const row of allRows) {
    let branch = branchMap.get(row.branchName);
    if (!branch) {
      branch = {
        branchName: row.branchName,
        isMerged: row.isMerged,
        data: {},
        rowCount: 0,
        latestUpdatedAt: row.updatedAt,
        statusTag: row.statusTag,
        author: row.createdByUser ?? null,
      };
      branchMap.set(row.branchName, branch);
    }

    const gridSlug = gridIdToSlug.get(row.gridId) ?? row.gridId;
    if (!branch.data[gridSlug]) branch.data[gridSlug] = [];
    branch.data[gridSlug].push({
      ...(row.data as Record<string, unknown>),
      _rowId: row.id,
      _sortOrder: row.sortOrder,
      ...(row.rowAccentHex != null ? { _rowAccentHex: row.rowAccentHex } : {}),
    });
    branch.rowCount++;
    if (row.updatedAt > branch.latestUpdatedAt)
      branch.latestUpdatedAt = row.updatedAt;
    if (row.isMerged) branch.isMerged = true;
  }

  const branches = Array.from(branchMap.values()).map((b) => ({
    id: b.branchName,
    branchName: b.branchName,
    label: b.branchName,
    data: b.data,
    updatedAt: b.latestUpdatedAt.toISOString(),
    formStatus: b.statusTag,
    author: b.author,
    rowCount: b.rowCount,
    isMerged: b.isMerged,
  }));

  return jsonOk({ branches });
}

/**
 * POST /api/trackers/[id]/branches
 * Create a new branch by copying all grid rows from basedOnBranch.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  if (!trackerId) return badRequest("Missing tracker id");

  const rawBody = await request.json().catch(() => null);
  if (rawBody == null) return badRequest("Invalid JSON body");
  const parsedBody = createBranchBodySchema.safeParse(rawBody);
  if (!parsedBody.success) return badRequest(parsedBody.error.message);
  const body = parsedBody.data;

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      versionControl: true,
      nodes: { where: { type: NodeType.GRID }, select: { id: true, slug: true } },
    },
  });
  if (!tracker) return notFound("Tracker not found");
  if (!tracker.versionControl)
    return badRequest("Version control is not enabled for this tracker");

  const gridIdToSlug = new Map(tracker.nodes.map((n: GridIdSlugPair) => [n.id, n.slug]));

  const existingBranch = await prisma.gridRow.findFirst({
    where: { trackerId, branchName: body.branchName, isMerged: false },
  });
  if (existingBranch)
    return badRequest(`Branch "${body.branchName}" already exists`);

  const baseBranch = body.basedOnBranch ?? body.basedOnId ?? "main";

  const sourceRows = await prisma.gridRow.findMany({
    where: {
      trackerId,
      branchName: baseBranch,
      deletedAt: null,
    },
  });

  if (sourceRows.length > 0) {
    await prisma.gridRow.createMany({
      data: sourceRows.map((row) => ({
        trackerId: row.trackerId,
        gridId: row.gridId,
        data: row.data ?? {},
        schemaVersion: row.schemaVersion,
        version: 1,
        statusTag: row.statusTag,
        rowAccentHex: row.rowAccentHex,
        sortOrder: row.sortOrder,
        branchName: body.branchName,
        isMerged: false,
        createdBy: authResult.user.id,
      })),
    });
  }

  const created = await prisma.gridRow.findMany({
    where: { trackerId, branchName: body.branchName },
    orderBy: { sortOrder: "asc" },
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  const data: Record<string, Array<Record<string, unknown>>> = {};
  for (const row of created) {
    const gridSlug = gridIdToSlug.get(row.gridId) ?? row.gridId;
    if (!data[gridSlug]) data[gridSlug] = [];
    data[gridSlug].push({
      ...(row.data as Record<string, unknown>),
      _rowId: row.id,
      _sortOrder: row.sortOrder,
      ...(row.rowAccentHex != null ? { _rowAccentHex: row.rowAccentHex } : {}),
    });
  }

  const latestRow = created.length > 0 ? created[created.length - 1] : null;

  return jsonOk({
    id: body.branchName,
    branchName: body.branchName,
    label: body.label ?? body.branchName,
    data,
    updatedAt: latestRow?.updatedAt?.toISOString() ?? new Date().toISOString(),
    formStatus: latestRow?.statusTag ?? null,
    author: latestRow?.createdByUser ?? null,
    rowCount: created.length,
    isMerged: false,
  });
}
