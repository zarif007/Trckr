import { beforeEach, describe, expect, it, vi } from "vitest";
import { decomposedPersistInputFromFlatRecord } from "@/lib/tracker-schema";

const prismaMock = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  module: { findMany: vi.fn() },
  trackerSchema: { findMany: vi.fn() },
}));

const createTrackerForUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/repositories", () => ({
  createTrackerForUser: createTrackerForUserMock,
}));

import { applyMasterDataBindings } from "@/lib/master-data/bindings";

/** Prisma-shaped tracker row for mocks (layout FKs use row ids; slugs live on nodes/fields). */
function mockPrismaTrackerFromFlatSchema(
  trackerRowId: string,
  name: string,
  flat: Record<string, unknown>,
) {
  const persist = decomposedPersistInputFromFlatRecord(flat);
  const tabBySlug = new Map<string, string>();
  const sectionBySlug = new Map<string, string>();
  const gridBySlug = new Map<string, string>();
  let nIdx = 0;
  const rawNodes = persist.nodes.map((n) => {
    const id = `${trackerRowId}-node-${nIdx++}`;
    if (n.type === "TAB") tabBySlug.set(n.slug, id);
    if (n.type === "SECTION") sectionBySlug.set(n.slug, id);
    if (n.type === "GRID") gridBySlug.set(n.slug, id);
    return { n, id };
  });

  const nodes = rawNodes.map(({ n, id }) => {
    let parentId: string | null = null;
    if (n.type === "SECTION" && n.parentId != null)
      parentId = tabBySlug.get(String(n.parentId)) ?? null;
    if (n.type === "GRID" && n.parentId != null)
      parentId = sectionBySlug.get(String(n.parentId)) ?? null;
    return {
      id,
      type: n.type,
      slug: n.slug,
      name: n.name,
      placeId: n.placeId,
      parentId,
      config: n.config,
      views: n.views,
    };
  });

  let fIdx = 0;
  const fields = persist.fields.map((f) => {
    const id = `${trackerRowId}-field-${fIdx++}`;
    return {
      id,
      slug: f.slug,
      dataType: f.dataType,
      ui: f.ui,
      config: f.config,
    };
  });
  const fieldBySlug = new Map(fields.map((f) => [f.slug, f.id]));

  const layoutNodes = persist.layoutNodes.map((ln) => ({
    gridId: gridBySlug.get(ln.gridId) ?? "",
    fieldId: fieldBySlug.get(ln.fieldId) ?? "",
    order: ln.order,
    row: ln.row ?? null,
    col: ln.col ?? null,
    renderAs: ln.renderAs ?? null,
  }));

  return {
    id: trackerRowId,
    name,
    meta: persist.meta,
    nodes,
    fields,
    layoutNodes,
  };
}

describe("applyMasterDataBindings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces placeholders with master data tracker bindings and strips local option grids", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "project-1" });
    prismaMock.module.findMany.mockResolvedValue([
      {
        id: "md-mod-1",
        name: "Master Data",
        settings: { masterDataModule: true },
      },
    ]);

    const masterDataSchema = {
      masterDataScope: "tracker" as const,
      tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
      sections: [
        {
          id: "status_master_data_section",
          name: "Status Master Data",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "status_grid",
          name: "Status",
          sectionId: "status_master_data_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "master_data_table_view",
              name: "Table",
              type: "table" as const,
              config: {},
            },
          ],
        },
      ],
      fields: [
        {
          id: "status",
          dataType: "string" as const,
          ui: { label: "Status" },
          config: {},
        },
      ],
      layoutNodes: [{ gridId: "status_grid", fieldId: "status", order: 1 }],
      bindings: {},
      validations: {},
      calculations: {},
      fieldRules: [],
      formActions: [
        {
          id: "default_save_action",
          label: "Save",
          statusTag: "Saved",
          isEditable: true,
        },
      ],
      styles: {},
    };
    prismaMock.trackerSchema.findMany.mockResolvedValue([
      mockPrismaTrackerFromFlatSchema("md-tracker-1", "Status", masterDataSchema),
    ]);

    const tracker = {
      masterDataScope: "module",
      tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
      sections: [
        {
          id: "main_section",
          name: "Main",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "orders_grid",
          name: "Orders",
          sectionId: "main_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "orders_table_view",
              name: "Table",
              type: "table",
              config: {},
            },
          ],
        },
        {
          id: "status_options_grid",
          name: "Status",
          sectionId: "main_section",
          placeId: 2,
          config: {},
          views: [
            {
              id: "status_table_view",
              name: "Table",
              type: "table",
              config: {},
            },
          ],
        },
      ],
      fields: [
        {
          id: "status",
          dataType: "options",
          ui: { label: "Status" },
          config: {},
        },
        {
          id: "status_option",
          dataType: "string",
          ui: { label: "Status" },
          config: {},
        },
      ],
      layoutNodes: [
        { gridId: "orders_grid", fieldId: "status", order: 1 },
        { gridId: "status_options_grid", fieldId: "status_option", order: 1 },
      ],
      bindings: {
        "orders_grid.status": {
          optionsGrid: "status_grid",
          labelField: "status_grid.status",
          optionsSourceKey: "status",
          fieldMappings: [
            { from: "status_grid.status", to: "orders_grid.status" },
          ],
          optionsSourceSchemaId: "__master_data__",
        },
      },
    };

    const result = await applyMasterDataBindings({
      tracker,
      scope: "module",
      masterDataTrackers: [
        {
          key: "status",
          name: "Status",
          labelFieldId: "status",
          schema: masterDataSchema,
        },
      ],
      projectId: "project-1",
      moduleId: "module-1",
      userId: "user-1",
    });

    const binding = (result.tracker.bindings as Record<string, unknown>)[
      "orders_grid.status"
    ] as {
      optionsSourceSchemaId: string;
      optionsGrid: string;
      labelField: string;
      optionsSourceKey?: string;
    };

    expect(binding.optionsSourceSchemaId).toBe("md-tracker-1");
    expect(binding.optionsGrid).toBe("status_grid");
    expect(binding.labelField).toBe("status_grid.status");
    expect(binding.optionsSourceKey).toBe("status");
    expect(
      (result.tracker.grids as Array<{ id: string }>).some(
        (g) => g.id === "orders_grid",
      ),
    ).toBe(true);
    expect(
      (result.tracker.grids as Array<{ id: string }>).some(
        (g) => g.id === "status_options_grid",
      ),
    ).toBe(false);
    expect(
      (result.tracker.fields as Array<{ id: string }>).some(
        (f) => f.id === "status_option",
      ),
    ).toBe(false);
    expect(createTrackerForUserMock).not.toHaveBeenCalled();
  });

  it("skips master data lookup when all bindings are already resolved", async () => {
    const tracker = {
      masterDataScope: "project",
      tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
      sections: [
        {
          id: "main_section",
          name: "Main",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "orders_grid",
          name: "Orders",
          sectionId: "main_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "orders_table_view",
              name: "Table",
              type: "table",
              config: {},
            },
          ],
        },
      ],
      fields: [
        {
          id: "status",
          dataType: "options",
          ui: { label: "Status" },
          config: {},
        },
      ],
      layoutNodes: [{ gridId: "orders_grid", fieldId: "status", order: 1 }],
      bindings: {
        "orders_grid.status": {
          optionsGrid: "status_grid",
          labelField: "status_grid.full_name",
          fieldMappings: [
            { from: "status_grid.full_name", to: "orders_grid.status" },
          ],
          optionsSourceSchemaId: "resolved-schema-id",
        },
      },
    };

    await applyMasterDataBindings({
      tracker,
      scope: "project",
      projectId: "project-1",
      moduleId: null,
      userId: "user-1",
    });

    expect(prismaMock.module.findMany).not.toHaveBeenCalled();
    expect(prismaMock.trackerSchema.findMany).not.toHaveBeenCalled();
  });

  it("creates master data trackers from specs with embedded metadata", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "project-1" });
    prismaMock.module.findMany.mockResolvedValue([
      {
        id: "md-mod-1",
        name: "Master Data",
        settings: { masterDataModule: true },
      },
    ]);
    prismaMock.trackerSchema.findMany.mockResolvedValue([]);

    const studentSchema = {
      masterDataScope: "tracker" as const,
      tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
      sections: [
        {
          id: "student_master_data_section",
          name: "Student Master Data",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "student_grid",
          name: "Student",
          sectionId: "student_master_data_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "master_data_table_view",
              name: "Table",
              type: "table" as const,
              config: {},
            },
          ],
        },
      ],
      fields: [
        {
          id: "full_name",
          dataType: "string" as const,
          ui: { label: "Full Name" },
          config: {},
        },
        {
          id: "roll",
          dataType: "string" as const,
          ui: { label: "Roll" },
          config: {},
        },
      ],
      layoutNodes: [
        { gridId: "student_grid", fieldId: "full_name", order: 1 },
        { gridId: "student_grid", fieldId: "roll", order: 2 },
      ],
      bindings: {},
      validations: {},
      calculations: {},
      fieldRules: [],
      formActions: [
        {
          id: "default_save_action",
          label: "Save",
          statusTag: "Saved",
          isEditable: true,
        },
      ],
      styles: {},
    };

    createTrackerForUserMock.mockResolvedValue({
      id: "md-student-1",
      name: "Student",
    });

    await applyMasterDataBindings({
      tracker: {
        masterDataScope: "project",
        tabs: [
          { id: "overview_tab", name: "Overview", placeId: 0, config: {} },
        ],
        sections: [
          {
            id: "main_section",
            name: "Main",
            tabId: "overview_tab",
            placeId: 1,
            config: {},
          },
        ],
        grids: [
          {
            id: "enrollments_grid",
            name: "Enrollments",
            sectionId: "main_section",
            placeId: 1,
            config: {},
            views: [
              {
                id: "enrollments_table_view",
                name: "Table",
                type: "table",
                config: {},
              },
            ],
          },
        ],
        fields: [
          {
            id: "student",
            dataType: "options",
            ui: { label: "Student" },
            config: {},
          },
        ],
        layoutNodes: [
          { gridId: "enrollments_grid", fieldId: "student", order: 1 },
        ],
        bindings: {
          "enrollments_grid.student": {
            optionsGrid: "student_grid",
            labelField: "student_grid.full_name",
            optionsSourceKey: "student",
            fieldMappings: [
              {
                from: "student_grid.full_name",
                to: "enrollments_grid.student",
              },
            ],
            optionsSourceSchemaId: "__master_data__",
          },
        },
      },
      scope: "project",
      masterDataTrackers: [
        {
          key: "student",
          name: "Student",
          labelFieldId: "full_name",
          schema: studentSchema,
        },
      ],
      projectId: "project-1",
      moduleId: null,
      userId: "user-1",
    });

    expect(createTrackerForUserMock).toHaveBeenCalled();
    const call = createTrackerForUserMock.mock.calls[0]?.[0];
    const persistedMeta = call?.meta as { masterDataMeta?: { key?: string; labelFieldId?: string } } | undefined;
    expect(persistedMeta?.masterDataMeta?.key).toBe("student");
    expect(persistedMeta?.masterDataMeta?.labelFieldId).toBe("full_name");
  });

  it("strips empty master_data_tab when module scope and no local options grids", async () => {
    const tracker = {
      masterDataScope: "module",
      tabs: [
        { id: "overview_tab", name: "Overview", placeId: 0, config: {} },
        {
          id: "master_data_tab",
          name: "Master Data",
          placeId: 999,
          config: {},
        },
      ],
      sections: [
        {
          id: "main_section",
          name: "Main",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
        {
          id: "master_data_section",
          name: "Master Data",
          tabId: "master_data_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "tasks_grid",
          name: "Tasks",
          sectionId: "main_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "tasks_table_view",
              name: "Table",
              type: "table" as const,
              config: {},
            },
          ],
        },
      ],
      fields: [
        {
          id: "title",
          dataType: "string" as const,
          ui: { label: "Title" },
          config: {},
        },
      ],
      layoutNodes: [{ gridId: "tasks_grid", fieldId: "title", order: 1 }],
      bindings: {},
    };

    const result = await applyMasterDataBindings({
      tracker,
      scope: "module",
      projectId: "project-1",
      moduleId: "module-1",
      userId: "user-1",
    });

    expect(
      (result.tracker.tabs as Array<{ id: string }>).some(
        (t) => t.id === "master_data_tab",
      ),
    ).toBe(false);
    expect(
      (result.tracker.sections as Array<{ id: string }>).some(
        (s) => s.id === "master_data_section",
      ),
    ).toBe(false);
    expect(
      (result.tracker.tabs as Array<{ id: string }>).map((t) => t.id),
    ).toEqual(["overview_tab"]);
    expect(prismaMock.module.findMany).not.toHaveBeenCalled();
  });

  it("strips master_data_tab subtree including non-options grids under module scope", async () => {
    const tracker = {
      masterDataScope: "module",
      tabs: [
        { id: "overview_tab", name: "Overview", placeId: 0, config: {} },
        {
          id: "master_data_tab",
          name: "Master Data",
          placeId: 999,
          config: {},
        },
      ],
      sections: [
        {
          id: "main_section",
          name: "Main",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
        {
          id: "master_data_section",
          name: "Master Data",
          tabId: "master_data_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "tasks_grid",
          name: "Tasks",
          sectionId: "main_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "tasks_table_view",
              name: "Table",
              type: "table" as const,
              config: {},
            },
          ],
        },
        {
          id: "bogus_grid",
          name: "Bogus",
          sectionId: "master_data_section",
          placeId: 1,
          config: {},
          views: [
            {
              id: "bogus_table_view",
              name: "Table",
              type: "table" as const,
              config: {},
            },
          ],
        },
      ],
      fields: [
        {
          id: "title",
          dataType: "string" as const,
          ui: { label: "Title" },
          config: {},
        },
        {
          id: "orphan_field",
          dataType: "string" as const,
          ui: { label: "Orphan" },
          config: {},
        },
      ],
      layoutNodes: [
        { gridId: "tasks_grid", fieldId: "title", order: 1 },
        { gridId: "bogus_grid", fieldId: "orphan_field", order: 1 },
      ],
      bindings: {},
    };

    const result = await applyMasterDataBindings({
      tracker,
      scope: "module",
      projectId: "project-1",
      moduleId: "module-1",
      userId: "user-1",
    });

    expect(
      (result.tracker.grids as Array<{ id: string }>).map((g) => g.id),
    ).toEqual(["tasks_grid"]);
    expect(
      (result.tracker.fields as Array<{ id: string }>).map((f) => f.id),
    ).toEqual(["title"]);
    expect(
      (result.tracker.tabs as Array<{ id: string }>).some(
        (t) => t.id === "master_data_tab",
      ),
    ).toBe(false);
    expect(prismaMock.module.findMany).not.toHaveBeenCalled();
  });

  it("resolves broken self-binding when optionsGrid doesn't exist in main tracker", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "project-1" });
    prismaMock.module.findMany.mockResolvedValue([
      {
        id: "md-mod-1",
        name: "Master Data",
        settings: { masterDataModule: true },
      },
    ]);

    const statusMdSchema = {
      masterDataScope: "tracker" as const,
      tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
      sections: [
        {
          id: "status_master_data_section",
          name: "Status Master Data",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "status_grid",
          name: "Status",
          sectionId: "status_master_data_section",
          placeId: 1,
          config: {},
          views: [{ id: "master_data_table_view", name: "Table", type: "table" as const, config: {} }],
        },
      ],
      fields: [
        { id: "value", dataType: "string" as const, ui: { label: "Value" }, config: {} },
      ],
      layoutNodes: [{ gridId: "status_grid", fieldId: "value", order: 1 }],
      bindings: {},
      validations: {},
      calculations: {},
      fieldRules: [],
      formActions: [{ id: "default_save_action", label: "Save", statusTag: "Saved", isEditable: true }],
      styles: {},
    };

    prismaMock.trackerSchema.findMany.mockResolvedValue([
      mockPrismaTrackerFromFlatSchema(
        "md-tracker-status",
        "Status",
        statusMdSchema,
      ),
    ]);

    // Main tracker: Status field has a broken __self__ binding pointing to status_grid,
    // but status_grid does NOT exist in the main tracker (only main_grid does).
    const result = await applyMasterDataBindings({
      tracker: {
        masterDataScope: "module",
        tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
        sections: [{ id: "main_section", name: "Main", tabId: "overview_tab", placeId: 1, config: {} }],
        grids: [
          {
            id: "main_grid",
            name: "Main",
            sectionId: "main_section",
            placeId: 1,
            config: {},
            views: [{ id: "main_table_view", name: "Table", type: "table", config: {} }],
          },
        ],
        fields: [
          { id: "status", dataType: "options", ui: { label: "Status" }, config: {} },
        ],
        layoutNodes: [{ gridId: "main_grid", fieldId: "status", order: 1 }],
        bindings: {
          "main_grid.status": {
            optionsSourceSchemaId: "ThisTracker",
            optionsGrid: "status_grid",
            labelField: "status_grid.value",
            fieldMappings: [],
          },
        },
      },
      scope: "module",
      masterDataTrackers: [],
      projectId: "project-1",
      moduleId: "module-1",
      userId: "user-1",
    });

    const binding = (result.tracker.bindings as Record<string, unknown>)[
      "main_grid.status"
    ] as { optionsSourceSchemaId: string; optionsGrid: string };

    expect(binding.optionsSourceSchemaId).toBe("md-tracker-status");
    expect(binding.optionsGrid).toBe("status_grid");
    expect(createTrackerForUserMock).not.toHaveBeenCalled();
  });

  it("resolves broken self-binding via grid ID hint when field label diverges from MD tracker name", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "project-1" });
    prismaMock.module.findMany.mockResolvedValue([
      {
        id: "md-mod-1",
        name: "Master Data",
        settings: { masterDataModule: true },
      },
    ]);

    const statusMdSchema = {
      masterDataScope: "tracker" as const,
      tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
      sections: [
        {
          id: "status_master_data_section",
          name: "Status Master Data",
          tabId: "overview_tab",
          placeId: 1,
          config: {},
        },
      ],
      grids: [
        {
          id: "status_grid",
          name: "Status",
          sectionId: "status_master_data_section",
          placeId: 1,
          config: {},
          views: [{ id: "master_data_table_view", name: "Table", type: "table" as const, config: {} }],
        },
      ],
      fields: [
        { id: "value", dataType: "string" as const, ui: { label: "Value" }, config: {} },
      ],
      layoutNodes: [{ gridId: "status_grid", fieldId: "value", order: 1 }],
      bindings: {},
      validations: {},
      calculations: {},
      fieldRules: [],
      formActions: [{ id: "default_save_action", label: "Save", statusTag: "Saved", isEditable: true }],
      styles: {},
    };

    // MD tracker is named "Status" but field.id is "status_name" and label is "Status Name".
    // normalizeName("Status Name") = "statusname" which does NOT match normalizeName("Status") = "status".
    // The gridIdHint extracted from optionsGrid "status_grid" → "status" → "status" should match.
    prismaMock.trackerSchema.findMany.mockResolvedValue([
      mockPrismaTrackerFromFlatSchema(
        "md-tracker-status",
        "Status",
        statusMdSchema,
      ),
    ]);

    const result = await applyMasterDataBindings({
      tracker: {
        masterDataScope: "module",
        tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
        sections: [{ id: "main_section", name: "Main", tabId: "overview_tab", placeId: 1, config: {} }],
        grids: [
          {
            id: "main_grid",
            name: "Main",
            sectionId: "main_section",
            placeId: 1,
            config: {},
            views: [{ id: "main_table_view", name: "Table", type: "table", config: {} }],
          },
        ],
        fields: [
          // Field ID "status_name" and label "Status Name" — diverges from MD tracker "Status"
          { id: "status_name", dataType: "options", ui: { label: "Status Name" }, config: {} },
        ],
        layoutNodes: [{ gridId: "main_grid", fieldId: "status_name", order: 1 }],
        bindings: {
          "main_grid.status_name": {
            optionsSourceSchemaId: "ThisTracker",
            optionsGrid: "status_grid",
            labelField: "status_grid.value",
            fieldMappings: [],
          },
        },
      },
      scope: "module",
      masterDataTrackers: [],
      projectId: "project-1",
      moduleId: "module-1",
      userId: "user-1",
    });

    const binding = (result.tracker.bindings as Record<string, unknown>)[
      "main_grid.status_name"
    ] as { optionsSourceSchemaId: string; optionsGrid: string };

    // Should match "Status" MD tracker via grid ID hint, not create a new "Status Name" tracker
    expect(binding.optionsSourceSchemaId).toBe("md-tracker-status");
    expect(binding.optionsGrid).toBe("status_grid");
    expect(createTrackerForUserMock).not.toHaveBeenCalled();
  });
});
