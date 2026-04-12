import { beforeEach, describe, expect, it, vi } from "vitest";

const trackerId = "tracker_test_1";
const userId = "user_test_1";

const tabId = "node_tab_stable";
const sectionId = "node_section_stable";
const gridId = "node_grid_stable";

const mocks = vi.hoisted(() => ({
  nodeFindMany: vi.fn(),
  nodeDeleteMany: vi.fn(),
  nodeUpdate: vi.fn(),
  nodeCreateMany: vi.fn(),
  fieldFindMany: vi.fn(),
  fieldDeleteMany: vi.fn(),
  fieldUpdate: vi.fn(),
  fieldCreateMany: vi.fn(),
  trackerSchemaFindFirst: vi.fn(),
  trackerSchemaUpdate: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    trackerSchema: {
      findFirst: mocks.trackerSchemaFindFirst,
      update: mocks.trackerSchemaUpdate,
    },
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/repositories/tracker-schema-cache-repository", () => ({
  invalidateTrackerSchemaCache: vi.fn(),
}));

import { replaceTrackerSchemaChildren } from "../tracker-repository";

function makeMockTx() {
  return {
    trackerNode: {
      findMany: mocks.nodeFindMany,
      deleteMany: mocks.nodeDeleteMany,
      update: mocks.nodeUpdate,
      createMany: mocks.nodeCreateMany,
    },
    trackerField: {
      findMany: mocks.fieldFindMany,
      deleteMany: mocks.fieldDeleteMany,
      update: mocks.fieldUpdate,
      createMany: mocks.fieldCreateMany,
    },
    trackerLayoutNode: { deleteMany: vi.fn(), createMany: vi.fn() },
    trackerBinding: { deleteMany: vi.fn(), createMany: vi.fn() },
    trackerValidation: { deleteMany: vi.fn(), createMany: vi.fn() },
    trackerCalculation: { deleteMany: vi.fn(), createMany: vi.fn() },
    trackerDynamicOption: { deleteMany: vi.fn(), createMany: vi.fn() },
    trackerFieldRule: { deleteMany: vi.fn(), createMany: vi.fn() },
    trackerSchema: { update: mocks.trackerSchemaUpdate },
  };
}

const minimalFullSchemaRow = {
  id: trackerId,
  projectId: "p1",
  moduleId: null,
  name: "T",
  type: "GENERAL" as const,
  systemType: null,
  instance: "SINGLE" as const,
  versionControl: false,
  autoSave: true,
  listForSchemaId: null,
  meta: null,
  schemaVersion: 2,
  nodes: [
    {
      id: tabId,
      trackerId,
      type: "TAB",
      slug: "main_tab",
      name: "Main",
      placeId: 0,
      parentId: null,
      config: null,
      views: null,
    },
    {
      id: sectionId,
      trackerId,
      type: "SECTION",
      slug: "main_section",
      name: "Section",
      placeId: 0,
      parentId: tabId,
      config: null,
      views: null,
    },
    {
      id: gridId,
      trackerId,
      type: "GRID",
      slug: "tasks_grid",
      name: "Tasks",
      placeId: 0,
      parentId: sectionId,
      config: null,
      views: [],
    },
  ],
  fields: [],
  layoutNodes: [],
  bindings: [],
  validations: [],
  calculations: [],
  dynamicOptions: [],
  fieldRules: [],
};

describe("replaceTrackerSchemaChildren (slug-stable nodes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const tx = makeMockTx();
    mocks.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<void>) => {
      await fn(tx);
    });

    mocks.nodeFindMany.mockResolvedValue([
      { id: tabId, slug: "main_tab" },
      { id: sectionId, slug: "main_section" },
      { id: gridId, slug: "tasks_grid" },
    ]);

    mocks.fieldFindMany.mockResolvedValue([]);

    mocks.trackerSchemaFindFirst
      .mockResolvedValueOnce({ id: trackerId })
      .mockResolvedValueOnce(minimalFullSchemaRow);
  });

  it("updates nodes in place and deletes only by slug notIn (preserves grid PK for GridRow FK)", async () => {
    const nodes = [
      {
        type: "TAB" as const,
        slug: "main_tab",
        name: "Main",
        placeId: 0,
        parentId: null,
        config: null,
        views: null,
      },
      {
        type: "SECTION" as const,
        slug: "main_section",
        name: "Section",
        placeId: 0,
        parentId: "main_tab",
        config: null,
        views: null,
      },
      {
        type: "GRID" as const,
        slug: "tasks_grid",
        name: "Tasks renamed",
        placeId: 0,
        parentId: "main_section",
        config: null,
        views: [],
      },
    ];

    await replaceTrackerSchemaChildren(trackerId, userId, { nodes });

    expect(mocks.nodeDeleteMany).toHaveBeenCalledWith({
      where: {
        trackerId,
        slug: { notIn: ["main_tab", "main_section", "tasks_grid"] },
      },
    });

    expect(mocks.nodeDeleteMany).not.toHaveBeenCalledWith({
      where: { trackerId },
    });

    expect(mocks.nodeCreateMany).not.toHaveBeenCalled();

    expect(mocks.nodeUpdate).toHaveBeenCalledWith({
      where: { id: tabId },
      data: expect.objectContaining({
        name: "Main",
      }),
    });

    expect(mocks.nodeUpdate).toHaveBeenCalledWith({
      where: { id: gridId },
      data: expect.objectContaining({
        name: "Tasks renamed",
      }),
    });
  });

  it("updates fields in place and uses slug notIn for orphan deletes", async () => {
    const fieldId = "field_stable_1";
    mocks.fieldFindMany.mockResolvedValue([
      { id: fieldId, slug: "title" },
    ]);
    mocks.trackerSchemaFindFirst
      .mockReset()
      .mockResolvedValueOnce({ id: trackerId })
      .mockResolvedValueOnce({
        ...minimalFullSchemaRow,
        fields: [
          {
            id: fieldId,
            trackerId,
            slug: "title",
            dataType: "text",
            ui: { label: "Title" },
            config: null,
          },
        ],
      });

    await replaceTrackerSchemaChildren(trackerId, userId, {
      fields: [
        {
          slug: "title",
          dataType: "text",
          ui: { label: "Title updated" },
          config: null,
        },
      ],
    });

    expect(mocks.fieldDeleteMany).toHaveBeenCalledWith({
      where: { trackerId, slug: { notIn: ["title"] } },
    });
    expect(mocks.fieldDeleteMany).not.toHaveBeenCalledWith({
      where: { trackerId },
    });
    expect(mocks.fieldCreateMany).not.toHaveBeenCalled();
    expect(mocks.fieldUpdate).toHaveBeenCalledWith({
      where: { id: fieldId },
      data: expect.objectContaining({
        dataType: "text",
      }),
    });
  });
});
