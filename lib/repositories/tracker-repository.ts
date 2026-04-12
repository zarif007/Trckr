import { randomUUID } from "crypto";
import { Instance, SystemFileType, TrackerSchemaType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createProjectForUser,
  findMostRecentProjectForUser,
} from "./project-repository";
import type {
  FullTrackerSchema,
  TrackerNodeRow,
  TrackerFieldRow,
  TrackerLayoutNodeRow,
  TrackerBindingRow,
  TrackerValidationRow,
  TrackerCalculationRow,
  TrackerDynamicOptionRow,
  TrackerFieldRuleRow,
  TrackerMeta,
} from "@/lib/schemas/tracker";

// ---------------------------------------------------------------------------
// Prisma include for full schema assembly
// ---------------------------------------------------------------------------

const fullSchemaInclude = {
  nodes: true,
  fields: true,
  layoutNodes: true,
  bindings: true,
  validations: true,
  calculations: true,
  dynamicOptions: true,
  fieldRules: true,
} as const;

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

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

export async function getFullTrackerSchemaForUser(
  trackerId: string,
  userId: string,
): Promise<FullTrackerSchema | null> {
  const row = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId },
    },
    include: fullSchemaInclude,
  });
  if (!row) return null;
  return mapDbRowToFullSchema(row);
}

function mapDbRowToFullSchema(
  row: Awaited<
    ReturnType<
      typeof prisma.trackerSchema.findFirst<{ include: typeof fullSchemaInclude }>
    >
  > &
    object,
): FullTrackerSchema {
  return {
    id: row.id,
    projectId: row.projectId,
    moduleId: row.moduleId,
    name: row.name,
    type: row.type,
    systemType: row.systemType,
    instance: row.instance,
    versionControl: row.versionControl,
    autoSave: row.autoSave,
    listForSchemaId: row.listForSchemaId,
    meta: row.meta as TrackerMeta | null,
    schemaVersion: row.schemaVersion,
    nodes: row.nodes.map(mapNodeRow),
    fields: row.fields.map(mapFieldRow),
    layoutNodes: row.layoutNodes.map(mapLayoutNodeRow),
    bindings: row.bindings.map(mapBindingRow),
    validations: row.validations.map(mapValidationRow),
    calculations: row.calculations.map(mapCalculationRow),
    dynamicOptions: row.dynamicOptions.map(mapDynamicOptionRow),
    fieldRules: row.fieldRules.map(mapFieldRuleRow),
  };
}

function mapNodeRow(n: { id: string; trackerId: string; type: string; slug: string; name: string; placeId: number; parentId: string | null; config: unknown; views: unknown }): TrackerNodeRow {
  return {
    id: n.id,
    trackerId: n.trackerId,
    type: n.type as TrackerNodeRow["type"],
    slug: n.slug,
    name: n.name,
    placeId: n.placeId,
    parentId: n.parentId,
    config: n.config as TrackerNodeRow["config"],
    views: n.views as TrackerNodeRow["views"],
  };
}

function mapFieldRow(f: { id: string; trackerId: string; slug: string; dataType: string; ui: unknown; config: unknown }): TrackerFieldRow {
  return {
    id: f.id,
    trackerId: f.trackerId,
    slug: f.slug,
    dataType: f.dataType,
    ui: f.ui as TrackerFieldRow["ui"],
    config: f.config as TrackerFieldRow["config"],
  };
}

function mapLayoutNodeRow(ln: { id: string; trackerId: string; gridId: string; fieldId: string; order: number; row: number | null; col: number | null; renderAs: string | null }): TrackerLayoutNodeRow {
  return {
    id: ln.id,
    trackerId: ln.trackerId,
    gridId: ln.gridId,
    fieldId: ln.fieldId,
    order: ln.order,
    row: ln.row,
    col: ln.col,
    renderAs: ln.renderAs,
  };
}

function mapBindingRow(b: { id: string; trackerId: string; sourceGridId: string | null; sourceFieldId: string | null; targetGridId: string; targetFieldId: string; config: unknown }): TrackerBindingRow {
  return {
    id: b.id,
    trackerId: b.trackerId,
    sourceGridId: b.sourceGridId,
    sourceFieldId: b.sourceFieldId,
    targetGridId: b.targetGridId,
    targetFieldId: b.targetFieldId,
    config: b.config as TrackerBindingRow["config"],
  };
}

function mapValidationRow(v: { id: string; trackerId: string; gridId: string; fieldId: string; rules: unknown }): TrackerValidationRow {
  return { id: v.id, trackerId: v.trackerId, gridId: v.gridId, fieldId: v.fieldId, rules: v.rules as unknown[] };
}

function mapCalculationRow(c: { id: string; trackerId: string; gridId: string; fieldId: string; expression: unknown }): TrackerCalculationRow {
  return { id: c.id, trackerId: c.trackerId, gridId: c.gridId, fieldId: c.fieldId, expression: c.expression as TrackerCalculationRow["expression"] };
}

function mapDynamicOptionRow(d: { id: string; trackerId: string; gridId: string; fieldId: string; definition: unknown }): TrackerDynamicOptionRow {
  return { id: d.id, trackerId: d.trackerId, gridId: d.gridId, fieldId: d.fieldId, definition: d.definition };
}

function mapFieldRuleRow(r: { id: string; trackerId: string; gridId: string; fieldId: string; config: unknown }): TrackerFieldRuleRow {
  return { id: r.id, trackerId: r.trackerId, gridId: r.gridId, fieldId: r.fieldId, config: r.config as unknown[] };
}

// ---------------------------------------------------------------------------
// Settings helper (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// List trackers for a project
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Update tracker metadata (name, meta)
// ---------------------------------------------------------------------------

export async function updateTrackerByIdForUser(
  trackerId: string,
  userId: string,
  update: { name?: string | null; meta?: TrackerMeta },
) {
  const existing = await findTrackerByIdForUser(trackerId, userId);
  if (!existing) return null;

  if (Object.keys(update).length === 0) return existing;

  return prisma.trackerSchema.update({
    where: { id: trackerId },
    data: update as Record<string, unknown>,
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Project resolution for create
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Create tracker with normalized children (transactional)
// ---------------------------------------------------------------------------

export interface CreateTrackerInput {
  userId: string;
  name: string;
  projectId?: string;
  moduleId?: string;
  instance?: "SINGLE" | "MULTI";
  versionControl?: boolean;
  autoSave?: boolean;
  type?: TrackerSchemaType;
  systemType?: SystemFileType | null;
  meta?: TrackerMeta | null;
  nodes?: Array<Omit<TrackerNodeRow, "id" | "trackerId">>;
  fields?: Array<Omit<TrackerFieldRow, "id" | "trackerId">>;
  layoutNodes?: Array<Omit<TrackerLayoutNodeRow, "id" | "trackerId">>;
  bindings?: Array<Omit<TrackerBindingRow, "id" | "trackerId">>;
  validations?: Array<Omit<TrackerValidationRow, "id" | "trackerId">>;
  calculations?: Array<Omit<TrackerCalculationRow, "id" | "trackerId">>;
  dynamicOptions?: Array<Omit<TrackerDynamicOptionRow, "id" | "trackerId">>;
  fieldRules?: Array<Omit<TrackerFieldRuleRow, "id" | "trackerId">>;
}

export async function createTrackerForUser(
  params: CreateTrackerInput,
) {
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
  const versionControl =
    instance === Instance.SINGLE ? (params.versionControl ?? false) : false;
  const autoSave =
    instance === Instance.SINGLE && !versionControl
      ? (params.autoSave ?? true)
      : false;

  const resolvedName = await resolveUniqueTrackerName(
    params.name,
    project.id,
    params.moduleId,
  );

  return prisma.$transaction(async (tx) => {
    const tracker = await tx.trackerSchema.create({
      data: {
        projectId: project.id,
        moduleId: params.moduleId ?? null,
        name: resolvedName,
        type: params.type ?? TrackerSchemaType.GENERAL,
        systemType: params.systemType ?? null,
        instance,
        versionControl,
        autoSave,
        meta: (params.meta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    const trackerId = tracker.id;

    const slugToDbId = new Map<string, string>();

    if (params.nodes?.length) {
      const tabNodes = params.nodes.filter((n) => n.type === "TAB");
      const sectionNodes = params.nodes.filter((n) => n.type === "SECTION");
      const gridNodes = params.nodes.filter((n) => n.type === "GRID");

      // PERFORMANCE: Pre-generate UUIDs for all nodes to enable batch creates
      for (const node of tabNodes) {
        slugToDbId.set(node.slug, randomUUID());
      }
      for (const node of sectionNodes) {
        slugToDbId.set(node.slug, randomUUID());
      }
      for (const node of gridNodes) {
        slugToDbId.set(node.slug, randomUUID());
      }

      // Batch create tabs (no parent dependencies)
      if (tabNodes.length > 0) {
        await tx.trackerNode.createMany({
          data: tabNodes.map((node) => ({
            id: slugToDbId.get(node.slug)!,
            trackerId,
            type: node.type,
            slug: node.slug,
            name: node.name,
            placeId: node.placeId,
            parentId: null,
            config: (node.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            views: (node.views as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          })),
        });
      }

      // Batch create sections (parent = tab)
      if (sectionNodes.length > 0) {
        await tx.trackerNode.createMany({
          data: sectionNodes.map((node) => ({
            id: slugToDbId.get(node.slug)!,
            trackerId,
            type: node.type,
            slug: node.slug,
            name: node.name,
            placeId: node.placeId,
            parentId: node.parentId ? slugToDbId.get(node.parentId) ?? null : null,
            config: (node.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            views: (node.views as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          })),
        });
      }

      // Batch create grids (parent = section)
      if (gridNodes.length > 0) {
        await tx.trackerNode.createMany({
          data: gridNodes.map((node) => ({
            id: slugToDbId.get(node.slug)!,
            trackerId,
            type: node.type,
            slug: node.slug,
            name: node.name,
            placeId: node.placeId,
            parentId: node.parentId ? slugToDbId.get(node.parentId) ?? null : null,
            config: (node.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            views: (node.views as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          })),
        });
      }
    }

    const fieldSlugToDbId = new Map<string, string>();

    if (params.fields?.length) {
      // PERFORMANCE: Pre-generate UUIDs and batch create
      for (const field of params.fields) {
        fieldSlugToDbId.set(field.slug, randomUUID());
      }

      await tx.trackerField.createMany({
        data: params.fields.map((field) => ({
          id: fieldSlugToDbId.get(field.slug)!,
          trackerId,
          slug: field.slug,
          dataType: field.dataType,
          ui: field.ui as Prisma.InputJsonValue,
          config: (field.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        })),
      });
    }

    if (params.layoutNodes?.length) {
      await tx.trackerLayoutNode.createMany({
        data: params.layoutNodes
          .map((ln) => {
            const gridDbId = slugToDbId.get(ln.gridId);
            const fieldDbId = fieldSlugToDbId.get(ln.fieldId);
            if (!gridDbId || !fieldDbId) return null;
            return {
              trackerId,
              gridId: gridDbId,
              fieldId: fieldDbId,
              order: ln.order,
              row: ln.row,
              col: ln.col,
              renderAs: ln.renderAs,
            };
          })
          .filter((ln): ln is NonNullable<typeof ln> => ln !== null),
      });
    }

    if (params.bindings?.length) {
      await tx.trackerBinding.createMany({
        data: params.bindings
          .map((b) => {
            const targetGridDbId = slugToDbId.get(b.targetGridId);
            const targetFieldDbId = fieldSlugToDbId.get(b.targetFieldId);
            if (!targetGridDbId || !targetFieldDbId) return null;

            const sourceGridDbId = b.sourceGridId ? slugToDbId.get(b.sourceGridId) ?? null : null;
            const sourceFieldDbId = b.sourceFieldId ? fieldSlugToDbId.get(b.sourceFieldId) ?? null : null;

            return {
              trackerId,
              sourceGridId: sourceGridDbId,
              sourceFieldId: sourceFieldDbId,
              targetGridId: targetGridDbId,
              targetFieldId: targetFieldDbId,
              config: b.config as Prisma.InputJsonValue,
            };
          })
          .filter((b): b is NonNullable<typeof b> => b !== null),
      });
    }

    if (params.validations?.length) {
      await tx.trackerValidation.createMany({
        data: params.validations
          .map((v) => {
            const gridDbId = slugToDbId.get(v.gridId);
            const fieldDbId = fieldSlugToDbId.get(v.fieldId);
            if (!gridDbId || !fieldDbId) return null;
            return {
              trackerId,
              gridId: gridDbId,
              fieldId: fieldDbId,
              rules: v.rules as Prisma.InputJsonValue,
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null),
      });
    }

    if (params.calculations?.length) {
      await tx.trackerCalculation.createMany({
        data: params.calculations
          .map((c) => {
            const gridDbId = slugToDbId.get(c.gridId);
            const fieldDbId = fieldSlugToDbId.get(c.fieldId);
            if (!gridDbId || !fieldDbId) return null;
            return {
              trackerId,
              gridId: gridDbId,
              fieldId: fieldDbId,
              expression: c.expression as Prisma.InputJsonValue,
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null),
      });
    }

    if (params.dynamicOptions?.length) {
      await tx.trackerDynamicOption.createMany({
        data: params.dynamicOptions
          .map((d) => {
            const gridDbId = slugToDbId.get(d.gridId);
            const fieldDbId = fieldSlugToDbId.get(d.fieldId);
            if (!gridDbId || !fieldDbId) return null;
            return {
              trackerId,
              gridId: gridDbId,
              fieldId: fieldDbId,
              definition: d.definition as Prisma.InputJsonValue,
            };
          })
          .filter((d): d is NonNullable<typeof d> => d !== null),
      });
    }

    if (params.fieldRules?.length) {
      await tx.trackerFieldRule.createMany({
        data: params.fieldRules
          .map((r) => {
            const gridDbId = slugToDbId.get(r.gridId);
            const fieldDbId = fieldSlugToDbId.get(r.fieldId);
            if (!gridDbId || !fieldDbId) return null;
            return {
              trackerId,
              gridId: gridDbId,
              fieldId: fieldDbId,
              config: r.config as Prisma.InputJsonValue,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null),
      });
    }

    return tracker;
  }, {
    timeout: 60000,
  });
}

// ---------------------------------------------------------------------------
// Bulk update normalized children (replace strategy within a transaction)
// ---------------------------------------------------------------------------

export interface UpdateTrackerSchemaChildrenInput {
  nodes?: Array<Omit<TrackerNodeRow, "id" | "trackerId">>;
  fields?: Array<Omit<TrackerFieldRow, "id" | "trackerId">>;
  layoutNodes?: Array<Omit<TrackerLayoutNodeRow, "id" | "trackerId">>;
  bindings?: Array<Omit<TrackerBindingRow, "id" | "trackerId">>;
  validations?: Array<Omit<TrackerValidationRow, "id" | "trackerId">>;
  calculations?: Array<Omit<TrackerCalculationRow, "id" | "trackerId">>;
  dynamicOptions?: Array<Omit<TrackerDynamicOptionRow, "id" | "trackerId">>;
  fieldRules?: Array<Omit<TrackerFieldRuleRow, "id" | "trackerId">>;
}

export async function replaceTrackerSchemaChildren(
  trackerId: string,
  userId: string,
  input: UpdateTrackerSchemaChildrenInput,
): Promise<FullTrackerSchema | null> {
  const existing = await findTrackerByIdForUser(trackerId, userId);
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    const slugToDbId = new Map<string, string>();
    const fieldSlugToDbId = new Map<string, string>();

    if (input.nodes !== undefined) {
      if (input.nodes.length === 0) {
        await tx.trackerNode.deleteMany({ where: { trackerId } });
      } else {
        const existingNodes = await tx.trackerNode.findMany({
          where: { trackerId },
          select: { id: true, slug: true },
        });
        for (const row of existingNodes) {
          slugToDbId.set(row.slug, row.id);
        }
        for (const node of input.nodes) {
          if (!slugToDbId.has(node.slug)) {
            slugToDbId.set(node.slug, randomUUID());
          }
        }

        const desiredSlugs = input.nodes.map((n) => n.slug);
        const tabNodes = input.nodes.filter((n) => n.type === "TAB");
        const sectionNodes = input.nodes.filter((n) => n.type === "SECTION");
        const gridNodes = input.nodes.filter((n) => n.type === "GRID");
        const existingSlugSet = new Set(existingNodes.map((n) => n.slug));

        const syncNodeTier = async (
          tier: typeof tabNodes,
          parentIdForTier: (node: (typeof tabNodes)[number]) => string | null,
        ) => {
          const toCreate = tier.filter((n) => !existingSlugSet.has(n.slug));
          const toUpdate = tier.filter((n) => existingSlugSet.has(n.slug));
          for (const node of toUpdate) {
            const id = slugToDbId.get(node.slug)!;
            await tx.trackerNode.update({
              where: { id },
              data: {
                type: node.type,
                name: node.name,
                placeId: node.placeId,
                parentId: parentIdForTier(node),
                config: (node.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                views: (node.views as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              },
            });
          }
          if (toCreate.length > 0) {
            await tx.trackerNode.createMany({
              data: toCreate.map((node) => ({
                id: slugToDbId.get(node.slug)!,
                trackerId,
                type: node.type,
                slug: node.slug,
                name: node.name,
                placeId: node.placeId,
                parentId: parentIdForTier(node),
                config: (node.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                views: (node.views as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              })),
            });
          }
        };

        await syncNodeTier(tabNodes, () => null);
        await syncNodeTier(sectionNodes, (node) =>
          node.parentId ? slugToDbId.get(node.parentId) ?? null : null,
        );
        await syncNodeTier(gridNodes, (node) =>
          node.parentId ? slugToDbId.get(node.parentId) ?? null : null,
        );

        await tx.trackerNode.deleteMany({
          where: { trackerId, slug: { notIn: desiredSlugs } },
        });
      }
    } else {
      const existingNodes = await tx.trackerNode.findMany({
        where: { trackerId },
        select: { id: true, slug: true },
      });
      for (const node of existingNodes) {
        slugToDbId.set(node.slug, node.id);
      }
    }

    if (input.fields !== undefined) {
      if (input.fields.length === 0) {
        await tx.trackerField.deleteMany({ where: { trackerId } });
      } else {
        const existingFields = await tx.trackerField.findMany({
          where: { trackerId },
          select: { id: true, slug: true },
        });
        for (const row of existingFields) {
          fieldSlugToDbId.set(row.slug, row.id);
        }
        for (const field of input.fields) {
          if (!fieldSlugToDbId.has(field.slug)) {
            fieldSlugToDbId.set(field.slug, randomUUID());
          }
        }

        const desiredFieldSlugs = input.fields.map((f) => f.slug);
        const existingFieldSlugSet = new Set(existingFields.map((f) => f.slug));
        const fieldsToCreate = input.fields.filter(
          (f) => !existingFieldSlugSet.has(f.slug),
        );
        const fieldsToUpdate = input.fields.filter((f) =>
          existingFieldSlugSet.has(f.slug),
        );

        for (const field of fieldsToUpdate) {
          const id = fieldSlugToDbId.get(field.slug)!;
          await tx.trackerField.update({
            where: { id },
            data: {
              dataType: field.dataType,
              ui: field.ui as Prisma.InputJsonValue,
              config: (field.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            },
          });
        }
        if (fieldsToCreate.length > 0) {
          await tx.trackerField.createMany({
            data: fieldsToCreate.map((field) => ({
              id: fieldSlugToDbId.get(field.slug)!,
              trackerId,
              slug: field.slug,
              dataType: field.dataType,
              ui: field.ui as Prisma.InputJsonValue,
              config: (field.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            })),
          });
        }

        await tx.trackerField.deleteMany({
          where: { trackerId, slug: { notIn: desiredFieldSlugs } },
        });
      }
    } else {
      const existingFields = await tx.trackerField.findMany({
        where: { trackerId },
        select: { id: true, slug: true },
      });
      for (const field of existingFields) {
        fieldSlugToDbId.set(field.slug, field.id);
      }
    }

    if (input.layoutNodes !== undefined) {
      await tx.trackerLayoutNode.deleteMany({ where: { trackerId } });
      if (input.layoutNodes.length) {
        await tx.trackerLayoutNode.createMany({
          data: input.layoutNodes
            .map((ln) => {
              const gridDbId = slugToDbId.get(ln.gridId);
              const fieldDbId = fieldSlugToDbId.get(ln.fieldId);
              if (!gridDbId || !fieldDbId) return null;
              return {
                trackerId,
                gridId: gridDbId,
                fieldId: fieldDbId,
                order: ln.order,
                row: ln.row,
                col: ln.col,
                renderAs: ln.renderAs,
              };
            })
            .filter((ln): ln is NonNullable<typeof ln> => ln !== null),
        });
      }
    }

    if (input.bindings !== undefined) {
      await tx.trackerBinding.deleteMany({ where: { trackerId } });
      if (input.bindings.length) {
        await tx.trackerBinding.createMany({
          data: input.bindings
            .map((b) => {
              const targetGridDbId = slugToDbId.get(b.targetGridId);
              const targetFieldDbId = fieldSlugToDbId.get(b.targetFieldId);
              if (!targetGridDbId || !targetFieldDbId) return null;

              const sourceGridDbId = b.sourceGridId ? slugToDbId.get(b.sourceGridId) ?? null : null;
              const sourceFieldDbId = b.sourceFieldId ? fieldSlugToDbId.get(b.sourceFieldId) ?? null : null;

              return {
                trackerId,
                sourceGridId: sourceGridDbId,
                sourceFieldId: sourceFieldDbId,
                targetGridId: targetGridDbId,
                targetFieldId: targetFieldDbId,
                config: b.config as Prisma.InputJsonValue,
              };
            })
            .filter((b): b is NonNullable<typeof b> => b !== null),
        });
      }
    }

    if (input.validations !== undefined) {
      await tx.trackerValidation.deleteMany({ where: { trackerId } });
      if (input.validations.length) {
        await tx.trackerValidation.createMany({
          data: input.validations
            .map((v) => {
              const gridDbId = slugToDbId.get(v.gridId);
              const fieldDbId = fieldSlugToDbId.get(v.fieldId);
              if (!gridDbId || !fieldDbId) return null;
              return {
                trackerId,
                gridId: gridDbId,
                fieldId: fieldDbId,
                rules: v.rules as Prisma.InputJsonValue,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null),
        });
      }
    }

    if (input.calculations !== undefined) {
      await tx.trackerCalculation.deleteMany({ where: { trackerId } });
      if (input.calculations.length) {
        await tx.trackerCalculation.createMany({
          data: input.calculations
            .map((c) => {
              const gridDbId = slugToDbId.get(c.gridId);
              const fieldDbId = fieldSlugToDbId.get(c.fieldId);
              if (!gridDbId || !fieldDbId) return null;
              return {
                trackerId,
                gridId: gridDbId,
                fieldId: fieldDbId,
                expression: c.expression as Prisma.InputJsonValue,
              };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null),
        });
      }
    }

    if (input.dynamicOptions !== undefined) {
      await tx.trackerDynamicOption.deleteMany({ where: { trackerId } });
      if (input.dynamicOptions.length) {
        await tx.trackerDynamicOption.createMany({
          data: input.dynamicOptions
            .map((d) => {
              const gridDbId = slugToDbId.get(d.gridId);
              const fieldDbId = fieldSlugToDbId.get(d.fieldId);
              if (!gridDbId || !fieldDbId) return null;
              return {
                trackerId,
                gridId: gridDbId,
                fieldId: fieldDbId,
                definition: d.definition as Prisma.InputJsonValue,
              };
            })
            .filter((d): d is NonNullable<typeof d> => d !== null),
        });
      }
    }

    if (input.fieldRules !== undefined) {
      await tx.trackerFieldRule.deleteMany({ where: { trackerId } });
      if (input.fieldRules.length) {
        await tx.trackerFieldRule.createMany({
          data: input.fieldRules
            .map((r) => {
              const gridDbId = slugToDbId.get(r.gridId);
              const fieldDbId = fieldSlugToDbId.get(r.fieldId);
              if (!gridDbId || !fieldDbId) return null;
              return {
                trackerId,
                gridId: gridDbId,
                fieldId: fieldDbId,
                config: r.config as Prisma.InputJsonValue,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null),
        });
      }
    }

    await tx.trackerSchema.update({
      where: { id: trackerId },
      data: { schemaVersion: { increment: 1 } },
    });
  }, {
    timeout: 60000,
  });

  // Invalidate cache after successful schema update
  const { invalidateTrackerSchemaCache } = await import("./tracker-schema-cache-repository");
  await invalidateTrackerSchemaCache(trackerId);

  return getFullTrackerSchemaForUser(trackerId, userId);
}
