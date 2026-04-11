import { describe, expect, it } from "vitest";

import {
  BOARD_DEFINITION_VERSION,
  emptyBoardDefinition,
  parseBoardDefinition,
  safeParseBoardDefinition,
} from "../board-definition";

describe("parseBoardDefinition", () => {
  it("returns empty definition for invalid input", () => {
    expect(parseBoardDefinition(null)).toEqual(emptyBoardDefinition());
    expect(parseBoardDefinition({ elements: "nope" })).toEqual(
      emptyBoardDefinition(),
    );
  });

  it("parses stat element", () => {
    const raw = {
      version: BOARD_DEFINITION_VERSION,
      elements: [
        {
          id: "e1",
          type: "stat",
          layout: { x: 0, y: 0, w: 4, h: 2 },
          source: {
            trackerSchemaId: "t1",
            gridId: "g1",
            fieldIds: ["f1"],
          },
          aggregate: "sum",
        },
      ],
    };
    const d = parseBoardDefinition(raw);
    expect(d.elements).toHaveLength(1);
    expect(d.elements[0]?.type).toBe("stat");
    if (d.elements[0]?.type === "stat") {
      expect(d.elements[0].aggregate).toBe("sum");
    }
  });

  it("safeParse rejects bad layout", () => {
    const r = safeParseBoardDefinition({
      version: BOARD_DEFINITION_VERSION,
      elements: [
        {
          id: "e1",
          type: "stat",
          layout: { x: 0, y: 0, w: 20, h: 2 },
          source: { trackerSchemaId: "t", gridId: "g", fieldIds: [] },
          aggregate: "count",
        },
      ],
    });
    expect(r.ok).toBe(false);
  });
});
