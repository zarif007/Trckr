import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  badRequest,
  jsonOk,
  notFound,
  readParams,
  requireParam,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

const optionsQuerySchema = z.object({
  gridId: z.string().min(1),
  labelField: z.string().min(1),
  valueField: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  includeValues: z.string().optional(),
  branchName: z.string().default("main"),
});

export type ResolvedOption = {
  id: string;
  label: string;
  value: unknown;
};

export type OptionsResponse = {
  items: ResolvedOption[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
};

/**
 * GET /api/trackers/[id]/options
 *
 * Returns paginated, searchable options for select fields with bindings.
 * Supports both local and foreign tracker bindings.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  if (!trackerId) return badRequest("Missing tracker id");

  const { searchParams } = new URL(request.url);

  // Validate query parameters
  const queryResult = optionsQuerySchema.safeParse({
    gridId: searchParams.get("gridId"),
    labelField: searchParams.get("labelField"),
    valueField: searchParams.get("valueField"),
    search: searchParams.get("search"),
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
    includeValues: searchParams.get("includeValues"),
    branchName: searchParams.get("branchName"),
  });

  if (!queryResult.success) {
    return badRequest(
      `Invalid query parameters: ${queryResult.error.message}`
    );
  }

  const {
    gridId,
    labelField,
    valueField,
    search,
    limit,
    offset,
    includeValues,
    branchName,
  } = queryResult.data;

  // Authorization: Verify user owns tracker
  const tracker = await prisma.trackerSchema.findFirst({
    where: { id: trackerId, project: { userId: authResult.user.id } },
    select: { id: true },
  });

  if (!tracker) return notFound("Tracker not found");

  // Build where clause for grid rows
  const where: Prisma.GridRowWhereInput = {
    trackerId,
    gridId,
    branchName,
    deletedAt: null,
  };

  // Add search filter on label field (JSONB path search)
  if (search && search.trim()) {
    where.data = {
      path: [labelField],
      string_contains: search.trim(),
    };
  }

  // Fetch paginated rows + total count
  const [rows, total] = await Promise.all([
    prisma.gridRow.findMany({
      where,
      select: { id: true, data: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.gridRow.count({ where }),
  ]);

  // Transform rows to options
  const items: ResolvedOption[] = rows.map((row) => {
    const data = row.data as Record<string, unknown>;
    const labelValue = data[labelField];
    const valueFieldValue = valueField ? data[valueField] : row.id;

    return {
      id: String(valueFieldValue ?? row.id),
      label: String(labelValue ?? ""),
      value: valueFieldValue ?? row.id,
    };
  });

  // Optionally fetch pre-selected values not in current page
  if (includeValues && includeValues.trim()) {
    const valuesToInclude = includeValues.split(",").filter(Boolean);

    if (valuesToInclude.length > 0 && valuesToInclude.length <= 100) {
      const existingIds = new Set(items.map((i) => i.id));
      const missingValues = valuesToInclude.filter((v) => !existingIds.has(v));

      if (missingValues.length > 0) {
        const valueFieldToQuery = valueField || "id";
        const preSelectedWhere: Prisma.GridRowWhereInput = {
          trackerId,
          gridId,
          branchName,
          deletedAt: null,
        };

        if (valueField) {
          preSelectedWhere.data = {
            path: [valueField],
            array_contains: missingValues,
          };
        } else {
          preSelectedWhere.id = { in: missingValues };
        }

        const preSelectedRows = await prisma.gridRow.findMany({
          where: preSelectedWhere,
          select: { id: true, data: true },
        });

        const preSelectedOptions: ResolvedOption[] = preSelectedRows.map(
          (row) => {
            const data = row.data as Record<string, unknown>;
            const labelValue = data[labelField];
            const valueFieldValue = valueField ? data[valueField] : row.id;

            return {
              id: String(valueFieldValue ?? row.id),
              label: String(labelValue ?? ""),
              value: valueFieldValue ?? row.id,
            };
          }
        );

        items.unshift(...preSelectedOptions);
      }
    }
  }

  return jsonOk<OptionsResponse>({
    items,
    total,
    hasMore: offset + limit < total,
    offset,
    limit,
  });
}
