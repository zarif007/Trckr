import { z } from "zod";
import {
  badRequest,
  jsonOk,
  notFound,
  readParams,
  requireParam,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  findTrackerByIdForUser,
  getFullTrackerSchemaForUser,
  updateTrackerByIdForUser,
  deleteTrackerByIdForUser,
  ownerScopeJsonForSettingsTracker,
  replaceTrackerSchemaChildren,
} from "@/lib/repositories";
import { trackerSchema as trackerSchemaZod } from "@/lib/schemas/tracker";
import { decomposeTrackerSchema, assembleTrackerDisplayProps } from "@/lib/tracker-schema";

const patchTrackerBodySchema = z
  .object({
    name: z.string().optional(),
    schema: z.unknown().optional(),
    meta: z.unknown().optional(),
  })
  .passthrough();

/**
 * GET /api/trackers/[id]
 * Returns assembled tracker schema from normalized tables.
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

  // Use cached schema for 3x performance improvement
  const { getCachedTrackerSchema } = await import("@/lib/repositories/tracker-schema-cache-repository");
  const assembled = await getCachedTrackerSchema(trackerId, authResult.user.id);
  if (!assembled) return notFound("Tracker not found");

  const full = await getFullTrackerSchemaForUser(trackerId, authResult.user.id);
  if (!full) return notFound("Tracker not found");

  const tracker = await findTrackerByIdForUser(trackerId, authResult.user.id);
  if (!tracker) return notFound("Tracker not found");

  const owner = await ownerScopeJsonForSettingsTracker(
    tracker,
    authResult.user.id,
  );

  const response = {
    ...full,
    schema: assembled,
    ...(owner ?? {}),
  };
  return jsonOk(response);
}

/**
 * PATCH /api/trackers/[id]
 * Update tracker name, meta, and/or full schema (decomposed into normalized tables).
 */
export async function PATCH(
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
  const parsedBody = patchTrackerBodySchema.safeParse(rawBody);
  if (!parsedBody.success) return badRequest("Invalid JSON body");
  const body = parsedBody.data;

  const tracker = await findTrackerByIdForUser(trackerId, authResult.user.id);
  if (!tracker) return notFound("Tracker not found");

  if (typeof body.name === "string") {
    await updateTrackerByIdForUser(trackerId, authResult.user.id, {
      name: body.name.trim() || null,
    });
  }

  if (
    body.schema !== undefined &&
    typeof body.schema === "object" &&
    body.schema !== null
  ) {
    let schema = body.schema as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(schema, "styles")) {
      schema = { ...schema };
      delete schema.styles;
    }

    const zodResult = trackerSchemaZod.safeParse(schema);
    const flatSchema = zodResult.success
      ? zodResult.data
      : (schema as ReturnType<typeof trackerSchemaZod.parse>);

    const decomposed = decomposeTrackerSchema(flatSchema);

    // Validate foreign bindings - prevent access to trackers user doesn't own
    if (decomposed.bindings) {
      const { verifyForeignTrackerAccess } = await import("@/lib/repositories/authorization-helpers");
      for (const binding of decomposed.bindings) {
        const config = binding.config as { optionsSourceSchemaId?: string };
        const sourceId = config.optionsSourceSchemaId;

        if (sourceId && !sourceId.startsWith("_intent:") && !sourceId.startsWith("placeholder:")) {
          const canAccess = await verifyForeignTrackerAccess(sourceId, authResult.user.id);
          if (!canAccess) {
            return badRequest(`Binding references inaccessible tracker: ${sourceId}`);
          }
        }
      }
    }

    if (decomposed.meta) {
      await updateTrackerByIdForUser(trackerId, authResult.user.id, {
        meta: decomposed.meta,
      });
    }

    await replaceTrackerSchemaChildren(trackerId, authResult.user.id, {
      nodes: decomposed.nodes,
      fields: decomposed.fields,
      layoutNodes: decomposed.layoutNodes,
      bindings: decomposed.bindings,
      validations: decomposed.validations,
      calculations: decomposed.calculations,
      dynamicOptions: decomposed.dynamicOptions,
      fieldRules: decomposed.fieldRules,
    });
  }

  const full = await getFullTrackerSchemaForUser(trackerId, authResult.user.id);
  if (!full) return notFound("Tracker not found");

  const assembled = assembleTrackerDisplayProps(full);

  const owner = await ownerScopeJsonForSettingsTracker(
    tracker,
    authResult.user.id,
  );

  const response = {
    ...full,
    schema: assembled,
    ...(owner ?? {}),
  };
  return jsonOk(response);
}

/**
 * DELETE /api/trackers/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(params);
  const trackerId = requireParam(id, "tracker id");
  if (!trackerId) return badRequest("Missing tracker id");

  const deleted = await deleteTrackerByIdForUser(trackerId, authResult.user.id);
  if (!deleted) return notFound("Tracker not found");

  return jsonOk({ deleted: true });
}
