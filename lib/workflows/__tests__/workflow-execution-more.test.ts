import { describe, expect, it } from "vitest";
import { executeConditionNode } from "../execution/node-executors/condition";
import { validateWorkflowSchemaFull } from "../validation";
import type { ConditionNode, WorkflowExecutionContext } from "../types";

describe("executeConditionNode", () => {
  it('returns "true" when condition evaluates truthy', async () => {
    const node: ConditionNode = {
      id: "c",
      type: "condition",
      position: { x: 0, y: 0 },
      config: {
        condition: { op: "const", value: true } as never,
      },
    };
    const ctx: WorkflowExecutionContext = {
      triggerData: {
        event: "row_create",
        trackerSchemaId: "t",
        gridId: "g",
        rowId: "r",
        rowData: {},
      },
      mappedData: {},
      nodeData: {},
      inlineEffects: {},
    };
    await expect(executeConditionNode(node, ctx)).resolves.toBe("true");
  });

  it('returns "false" when condition evaluates falsy', async () => {
    const node: ConditionNode = {
      id: "c",
      type: "condition",
      position: { x: 0, y: 0 },
      config: {
        condition: { op: "const", value: false } as never,
      },
    };
    const ctx: WorkflowExecutionContext = {
      triggerData: {
        event: "row_create",
        trackerSchemaId: "t",
        gridId: "g",
        rowId: "r",
        rowData: {},
      },
      mappedData: {},
      nodeData: {},
      inlineEffects: {},
    };
    await expect(executeConditionNode(node, ctx)).resolves.toBe("false");
  });
});

describe("validateWorkflowSchemaFull graph shape", () => {
  it("errors when there is no trigger node", () => {
    const { errors } = validateWorkflowSchemaFull({
      version: 2,
      nodes: [
        {
          id: "map",
          type: "map_fields",
          position: { x: 0, y: 0 },
          config: { mappings: [] },
        },
      ],
      edges: [],
    });
    expect(errors.some((e) => e.code === "NO_TRIGGER")).toBe(true);
  });

  it("errors on disconnected nodes", () => {
    const { errors } = validateWorkflowSchemaFull({
      version: 2,
      nodes: [
        {
          id: "trigger",
          type: "trigger",
          position: { x: 0, y: 0 },
          config: { trackerSchemaId: "a", event: "row_create" },
        },
        {
          id: "orphan",
          type: "map_fields",
          position: { x: 0, y: 0 },
          config: {
            mappings: [
              {
                id: "m",
                source: { type: "field", path: "x" },
                target: { trackerSchemaId: "b", fieldId: "y" },
              },
            ],
          },
        },
      ],
      edges: [],
    });
    expect(errors.some((e) => e.code === "DISCONNECTED_NODE")).toBe(true);
  });
});
