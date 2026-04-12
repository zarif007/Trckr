import {
  badRequest,
  jsonOk,
  notFound,
  readParams,
  requireParam,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { listDistinctDataValuesForGridField } from "@/lib/repositories/grid-row-repository";
import { assertSafeJsonPathKey } from "@/lib/grid-data-loading";
import { NodeType } from "@prisma/client";

/**
 * GET /api/trackers/[id]/grids/[gridSlug]/distinct-field-values?fieldKey=...&branch=main
 *
 * Returns distinct non-empty values for one `row.data` JSON key. Used by Kanban when the
 * client snapshot has no rows so column ids cannot be inferred locally — merged in the
 * client by `buildKanbanGroupColumnDescriptors` (`lib/tracker-grid-rows/kanban-column-discovery`).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; gridSlug: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id, gridSlug } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  const slug = requireParam(gridSlug, "grid slug");
  if (!trackerId || !slug) return badRequest("Missing params");

  const { searchParams } = new URL(request.url);
  const fieldKey = searchParams.get("fieldKey") ?? "";
  const branchName = searchParams.get("branch") ?? "main";

  if (!fieldKey.trim()) {
    return badRequest("Missing fieldKey");
  }

  try {
    assertSafeJsonPathKey(fieldKey);
  } catch {
    return badRequest("Invalid fieldKey");
  }

  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: {
      id: true,
      nodes: {
        where: { type: NodeType.GRID, slug },
        select: { id: true, slug: true },
      },
    },
  });
  if (!tracker) return notFound("Tracker not found");
  const gridNode = tracker.nodes[0];
  if (!gridNode) return notFound("Grid not found");

  const result = await listDistinctDataValuesForGridField(
    trackerId,
    gridNode.id,
    authResult.user.id,
    fieldKey,
    { branchName },
  );
  if (!result) return notFound("Tracker not found");

  return jsonOk({ values: result.values, gridSlug: gridNode.slug });
}
