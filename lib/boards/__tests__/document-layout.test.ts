import { describe, expect, it } from "vitest";

import { emptyBoardDefinition, type BoardElement } from "../board-definition";
import {
  cloneBoardDefinition,
  nextDocumentSlot,
  sortBoardElementsByDocumentOrder,
} from "../document-layout";

function statAt(
  layout: BoardElement["layout"],
  id = "a",
): BoardElement {
  return {
    id,
    type: "stat",
    layout,
    source: {
      trackerSchemaId: "t1",
      gridId: "g1",
      fieldIds: [],
    },
    aggregate: "count",
  };
}

describe("document-layout", () => {
  it("nextDocumentSlot stacks below the lowest block", () => {
    const def = {
      ...emptyBoardDefinition(),
      elements: [statAt({ x: 0, y: 0, w: 12, h: 2 })],
    };
    expect(nextDocumentSlot(def, "stat")).toEqual({
      x: 0,
      y: 2,
      w: 12,
      h: 2,
    });
    expect(nextDocumentSlot(def, "table")).toEqual({
      x: 0,
      y: 2,
      w: 12,
      h: 5,
    });
  });

  it("sortBoardElementsByDocumentOrder orders by y then x", () => {
    const elements = [
      statAt({ x: 0, y: 4, w: 12, h: 2 }, "bottom"),
      statAt({ x: 0, y: 0, w: 12, h: 2 }, "top"),
      statAt({ x: 6, y: 2, w: 6, h: 2 }, "right"),
      statAt({ x: 0, y: 2, w: 6, h: 2 }, "left"),
    ];
    const sorted = sortBoardElementsByDocumentOrder(elements);
    expect(sorted.map((e) => e.id)).toEqual(["top", "left", "right", "bottom"]);
  });

  it("cloneBoardDefinition returns a deep copy", () => {
    const def = {
      ...emptyBoardDefinition(),
      elements: [statAt({ x: 0, y: 0, w: 12, h: 2 })],
    };
    const copy = cloneBoardDefinition(def);
    expect(copy).toEqual(def);
    copy.elements[0]!.layout.x = 99;
    expect(def.elements[0]!.layout.x).toBe(0);
  });
});
