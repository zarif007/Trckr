import { describe, expect, it, vi, beforeEach } from "vitest";
import { workflowSchemaZod } from "../schema";
import {
  validateWorkflowSchemaFull,
  normalizeWorkflowEdges,
} from "../validation";
import { executeMapFieldsNode } from "../execution/node-executors/map-fields";
import type { MapFieldsNode, WorkflowExecutionContext } from "../types";
import { getPrimaryGridSlug } from "../resolve-primary-grid";

describe("workflowSchemaZod", () => {
  it("accepts v1 and v2 discriminants", () => {
    const v1 = workflowSchemaZod.safeParse({
      version: 1,
      nodes: [
        {
          id: "t",
          type: "trigger",
          position: { x: 0, y: 0 },
          config: {
            trackerSchemaId: "tr",
            gridId: "g",
            event: "row_create",
          },
        },
      ],
      edges: [],
    });
    expect(v1.success).toBe(true);

    const v2 = workflowSchemaZod.safeParse({
      version: 2,
      nodes: [
        {
          id: "t",
          type: "trigger",
          position: { x: 0, y: 0 },
          config: {
            trackerSchemaId: "tr",
            event: "row_update",
          },
        },
        {
          id: "r",
          type: "redirect",
          position: { x: 0, y: 0 },
          config: { kind: "url", value: "https://example.com" },
        },
      ],
      edges: [],
    });
    expect(v2.success).toBe(true);
  });
});

describe("validateWorkflowSchemaFull v2", () => {
  const baseV2 = {
    version: 2 as const,
    nodes: [
      {
        id: "trigger",
        type: "trigger" as const,
        position: { x: 0, y: 0 },
        config: {
          trackerSchemaId: "a",
          event: "row_create" as const,
        },
      },
      {
        id: "map",
        type: "map_fields" as const,
        position: { x: 0, y: 0 },
        config: {
          mappings: [
            {
              id: "m1",
              source: { type: "field" as const, path: "f1" },
              target: { trackerSchemaId: "b", fieldId: "f2" },
            },
          ],
        },
      },
      {
        id: "action",
        type: "action" as const,
        position: { x: 0, y: 0 },
        config: {
          actionType: "create_row" as const,
          trackerSchemaId: "b",
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger", target: "map" },
      { id: "e2", source: "map", target: "action" },
    ],
  };

  it("requires map_fields before action on all paths", () => {
    const bad = {
      ...baseV2,
      edges: [
        { id: "e1", source: "trigger", target: "action" },
        { id: "e2", source: "trigger", target: "map" },
        { id: "e3", source: "map", target: "action" },
      ],
    };
    const { errors } = validateWorkflowSchemaFull(bad);
    expect(errors.some((e) => e.code === "MAP_REQUIRED_BEFORE_ACTION")).toBe(
      true,
    );
  });

  it("requires branchType on edges from condition nodes", () => {
    const withCondition = {
      version: 2 as const,
      nodes: [
        baseV2.nodes[0],
        {
          id: "if",
          type: "condition" as const,
          position: { x: 0, y: 0 },
          config: {
            condition: { op: "const", value: true } as never,
          },
        },
        baseV2.nodes[1],
        baseV2.nodes[2],
      ],
      edges: [
        { id: "e0", source: "trigger", target: "if" },
        { id: "e1", source: "if", target: "map", sourceHandle: "true" },
        { id: "e2", source: "map", target: "action" },
      ],
    };
    const { errors } = validateWorkflowSchemaFull(withCondition);
    expect(errors.some((e) => e.code === "MISSING_BRANCH_TYPE")).toBe(true);
  });

  it("passes valid v2 linear flow", () => {
    const { errors } = validateWorkflowSchemaFull(baseV2);
    expect(errors).toHaveLength(0);
  });
});

describe("normalizeWorkflowEdges", () => {
  it("infers branchType from sourceHandle", () => {
    const schema = normalizeWorkflowEdges({
      version: 1,
      nodes: [
        {
          id: "c",
          type: "condition",
          position: { x: 0, y: 0 },
          config: { condition: { op: "const", value: true } as never },
        },
      ],
      edges: [
        {
          id: "e1",
          source: "c",
          target: "x",
          sourceHandle: "true",
        },
      ],
    });
    expect(schema.edges[0].branchType).toBe("true");
  });
});

describe("executeMapFieldsNode", () => {
  it("writes flat field keys for row payloads", async () => {
    const node: MapFieldsNode = {
      id: "map",
      type: "map_fields",
      position: { x: 0, y: 0 },
      config: {
        mappings: [
          {
            id: "1",
            source: { type: "field", path: "title" },
            target: {
              trackerSchemaId: "t2",
              gridId: "legacy",
              fieldId: "name",
            },
          },
        ],
      },
    };
    const ctx: WorkflowExecutionContext = {
      triggerData: {
        event: "row_create",
        trackerSchemaId: "t1",
        gridId: "g1",
        rowId: "r1",
        rowData: { title: "Hello" },
      },
      mappedData: {},
      nodeData: {},
      inlineEffects: {},
    };
    const out = await executeMapFieldsNode(node, ctx);
    expect(out.name).toBe("Hello");
    expect(ctx.mappedData.name).toBe("Hello");
  });
});

describe("getPrimaryGridSlug", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns first GRID slug by placeId", async () => {
    const { prisma } = await import("@/lib/db");
    vi.spyOn(prisma.trackerNode, "findFirst").mockResolvedValue({
      slug: "tasks",
    } as never);

    await expect(getPrimaryGridSlug("tracker-1")).resolves.toBe("tasks");
    expect(prisma.trackerNode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { placeId: "asc" },
      }),
    );
  });
});
