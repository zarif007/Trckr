import { Instance, SystemFileType, TrackerSchemaType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createProjectForUser,
  findMostRecentProjectForUser,
} from "./project-repository";

export async function findTrackerByIdForUser(
  trackerId: string,
  userId: string,
) {
  return prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId },
    },
  });
}

/**
 * For the SETTINGS system tracker, attach owning project or module `settings` JSON
 * (`ownerScopeSettings`) so the editor can show the same DB column the form edits.
 */
export async function ownerScopeJsonForSettingsTracker(
  tracker: {
    systemType: SystemFileType | null;
    projectId: string;
    moduleId: string | null;
  },
  userId: string,
): Promise<{ ownerScopeSettings: unknown } | null> {
  if (tracker.systemType !== SystemFileType.SETTINGS) return null;

  if (tracker.moduleId) {
    const row = await prisma.module.findFirst({
      where: { id: tracker.moduleId, project: { userId } },
      select: { settings: true },
    });
    return { ownerScopeSettings: row?.settings ?? null };
  }

  const row = await prisma.project.findFirst({
    where: { id: tracker.projectId, userId },
    select: { settings: true },
  });
  return { ownerScopeSettings: row?.settings ?? null };
}

/** Minimal tracker list for a project (bindings picker). Returns null if project not owned by user. */
export async function listTrackerSchemasForProjectForUser(
  projectId: string,
  userId: string,
) {
  const owned = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!owned) return null;
  return prisma.trackerSchema.findMany({
    where: { projectId },
    select: { id: true, name: true, listForSchemaId: true },
    orderBy: [{ name: "asc" }],
  });
}

export async function updateTrackerByIdForUser(
  trackerId: string,
  userId: string,
  update: { name?: string | null; schema?: object },
) {
  const existing = await findTrackerByIdForUser(trackerId, userId);
  if (!existing) return null;

  if (Object.keys(update).length === 0) return existing;

  return prisma.trackerSchema.update({
    where: { id: trackerId },
    data: update,
  });
}

export async function deleteTrackerByIdForUser(
  trackerId: string,
  userId: string,
) {
  const existing = await findTrackerByIdForUser(trackerId, userId);
  if (!existing) return null;
  return prisma.trackerSchema.delete({
    where: { id: trackerId },
  });
}

export async function resolveTargetProjectForTrackerCreate(
  userId: string,
  preferredProjectId?: string,
) {
  if (preferredProjectId) {
    const owned = await prisma.project.findFirst({
      where: { id: preferredProjectId, userId },
      select: { id: true },
    });
    if (owned) return owned;
  }

  const recent = await findMostRecentProjectForUser(userId);
  if (recent) return { id: recent.id };

  const created = await createProjectForUser(userId, "My Project");
  return { id: created.id };
}

/**
 * Resolves a unique tracker name within a project/module scope.
 * If the name already exists, appends " (1)", " (2)", etc. — like OS file naming.
 */
export async function resolveUniqueTrackerName(
  baseName: string,
  projectId: string,
  moduleId?: string | null,
): Promise<string> {
  const scopeWhere = moduleId
    ? { projectId, moduleId }
    : { projectId, moduleId: null };

  const existing = await prisma.trackerSchema.findMany({
    where: scopeWhere,
    select: { name: true },
  });

  const existingNames = new Set(existing.map((t) => t.name?.trim() ?? ""));

  if (!existingNames.has(baseName)) return baseName;

  let counter = 1;
  while (existingNames.has(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
}

export async function createTrackerForUser(params: {
  userId: string;
  name: string;
  schema: object;
  projectId?: string;
  moduleId?: string;
  instance?: "SINGLE" | "MULTI";
  versionControl?: boolean;
  autoSave?: boolean;
  type?: TrackerSchemaType;
  systemType?: SystemFileType | null;
}) {
  const project = await resolveTargetProjectForTrackerCreate(
    params.userId,
    params.projectId,
  );

  if (params.moduleId) {
    const mod = await prisma.module.findFirst({
      where: { id: params.moduleId, projectId: project.id },
      select: { id: true },
    });
    if (!mod) {
      throw new Error("Module not found or does not belong to project");
    }
  }

  const instance =
    params.instance === "MULTI" ? Instance.MULTI : Instance.SINGLE;
  // Version control is only supported for single-instance trackers
  const versionControl =
    instance === Instance.SINGLE ? (params.versionControl ?? false) : false;
  // Auto-save is only supported for single-instance trackers without version control
  const autoSave =
    instance === Instance.SINGLE && !versionControl
      ? (params.autoSave ?? true)
      : false;

  const resolvedName = await resolveUniqueTrackerName(
    params.name,
    project.id,
    params.moduleId,
  );

  const tracker = await prisma.trackerSchema.create({
    data: {
      projectId: project.id,
      moduleId: params.moduleId ?? null,
      name: resolvedName,
      type: params.type ?? TrackerSchemaType.GENERAL,
      systemType: params.systemType ?? null,
      instance,
      versionControl,
      autoSave,
      schema: params.schema,
    },
  });

  return tracker;
}
