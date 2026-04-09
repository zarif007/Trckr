import { z } from "zod";
import { Prisma, TrackerSchemaType } from "@prisma/client";
import { badRequest, jsonOk } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  createTrackerForUser,
  getFullTrackerSchemaForUser,
} from "@/lib/repositories";
import { prisma } from "@/lib/db";
import {
  normalizeMasterDataScope,
  type MasterDataScope,
} from "@/lib/master-data-scope";
import { trackerSchema as trackerSchemaZod } from "@/lib/schemas/tracker";
import { decomposeTrackerSchema } from "@/lib/tracker-schema";
import { assembleTrackerDisplayProps } from "@/lib/tracker-schema";
import { createEmptyTrackerSchema } from "@/app/components/tracker-display/tracker-editor/constants";

const createTrackerBodySchema = z
  .object({
    name: z.string().optional(),
    schema: z.unknown().optional(),
    new: z.boolean().optional(),
    projectId: z.string().optional(),
    moduleId: z.string().optional(),
    instance: z.enum(["SINGLE", "MULTI"]).optional(),
    versionControl: z.boolean().optional(),
    autoSave: z.boolean().optional(),
    masterDataScope: z.enum(["tracker", "module", "project"]).optional(),
    setMasterDataDefaultForOwner: z.boolean().optional(),
    updateMasterDataDefaultForOwner: z.boolean().optional(),
  })
  .passthrough();

/**
 * POST /api/trackers
 * Create a tracker with normalized schema tables.
 * Body accepts the flat schema shape (for AI/legacy compat) and decomposes it.
 */
export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const parsed = await request.json().catch(() => null);
  if (parsed == null) return badRequest("Invalid JSON body");

  const bodyResult = createTrackerBodySchema.safeParse(parsed);
  if (!bodyResult.success) return badRequest("Invalid JSON body");
  const body = bodyResult.data;

  const isNew = body.new === true;
  const schemaFromBody = body.schema;
  const requestedScope =
    normalizeMasterDataScope(body.masterDataScope) ?? "tracker";

  const stripLegacyStyles = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const next = { ...(value as Record<string, unknown>) };
    delete next.styles;
    return next;
  };

  const rawSchema = isNew
    ? typeof schemaFromBody === "object" && schemaFromBody !== null
      ? {
          ...stripLegacyStyles(schemaFromBody),
          masterDataScope: requestedScope,
        }
      : ({
          ...createEmptyTrackerSchema(),
          masterDataScope: requestedScope,
        } as Record<string, unknown>)
    : schemaFromBody;

  if (
    rawSchema === undefined ||
    typeof rawSchema !== "object" ||
    rawSchema === null
  ) {
    return badRequest("Missing or invalid schema");
  }

  const schemaWithoutStyles = stripLegacyStyles(rawSchema);

  const zodResult = trackerSchemaZod.safeParse(schemaWithoutStyles);
  const flatSchema = zodResult.success
    ? zodResult.data
    : (schemaWithoutStyles as ReturnType<typeof trackerSchemaZod.parse>);

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

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Untitled tracker";

  const instance = body.instance === "MULTI" ? "MULTI" : "SINGLE";
  const versionControl =
    instance === "SINGLE" ? (body.versionControl ?? false) : false;
  const autoSave =
    instance === "SINGLE" && !versionControl ? (body.autoSave ?? true) : false;

  const tracker = await createTrackerForUser({
    userId: authResult.user.id,
    name,
    projectId:
      typeof body.projectId === "string" ? body.projectId.trim() : undefined,
    moduleId:
      typeof body.moduleId === "string" ? body.moduleId.trim() : undefined,
    instance,
    versionControl,
    autoSave,
    type: TrackerSchemaType.GENERAL,
    meta: decomposed.meta,
    nodes: decomposed.nodes,
    fields: decomposed.fields,
    layoutNodes: decomposed.layoutNodes,
    bindings: decomposed.bindings,
    validations: decomposed.validations,
    calculations: decomposed.calculations,
    dynamicOptions: decomposed.dynamicOptions,
    fieldRules: decomposed.fieldRules,
  });

  const shouldPersistDefault =
    body.setMasterDataDefaultForOwner === true ||
    body.updateMasterDataDefaultForOwner === true;
  if (shouldPersistDefault) {
    const nextScope: MasterDataScope = requestedScope;
    const nextSettings = (settings: unknown): Prisma.InputJsonValue => {
      if (
        !settings ||
        typeof settings !== "object" ||
        Array.isArray(settings)
      ) {
        return { masterDataDefaultScope: nextScope };
      }
      return {
        ...(settings as Record<string, Prisma.InputJsonValue>),
        masterDataDefaultScope: nextScope,
      };
    };

    if (tracker.moduleId) {
      const mod = await prisma.module.findFirst({
        where: {
          id: tracker.moduleId,
          projectId: tracker.projectId,
          project: { userId: authResult.user.id },
        },
        select: { id: true, settings: true },
      });
      if (mod) {
        await prisma.module.update({
          where: { id: mod.id },
          data: { settings: nextSettings(mod.settings) },
        });
      }
    } else {
      const project = await prisma.project.findFirst({
        where: { id: tracker.projectId, userId: authResult.user.id },
        select: { id: true, settings: true },
      });
      if (project) {
        await prisma.project.update({
          where: { id: project.id },
          data: { settings: nextSettings(project.settings) },
        });
      }
    }
  }

  const full = await getFullTrackerSchemaForUser(
    tracker.id,
    authResult.user.id,
  );
  return jsonOk(full ?? tracker);
}
