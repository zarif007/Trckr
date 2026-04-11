import { describe, expect, it } from "vitest";

import { emptyBoardDefinition, type BoardElement } from "../board-definition";
import {
  cloneBoardDefinition,
  getNextPlaceId,
  sortBoardElementsByDocumentOrder,
} from "../document-layout";

function statAt(placeId: number, id = "a"): BoardElement {
  return {
    id,
    type: "stat",
    placeId,
    source: {
      trackerSchemaId: "t1",
      gridId: "g1",
      fieldIds: [],
    },
    aggregate: "count",
  };
}

describe("document-layout", () => {
  it("getNextPlaceId returns max placeId + 1", () => {
    const def = {
      ...emptyBoardDefinition(),
      elements: [statAt(0), statAt(2), statAt(1)],
    };
    expect(getNextPlaceId(def.elements)).toBe(3);
  });

  it("getNextPlaceId returns 0 for empty board", () => {
    const def = emptyBoardDefinition();
    expect(getNextPlaceId(def.elements)).toBe(0);
  });

  it("sortBoardElementsByDocumentOrder orders by placeId", () => {
    const elements = [
      statAt(3, "fourth"),
      statAt(0, "first"),
      statAt(2, "third"),
      statAt(1, "second"),
    ];
    const sorted = sortBoardElementsByDocumentOrder(elements);
    expect(sorted.map((e) => e.id)).toEqual(["first", "second", "third", "fourth"]);
  });

  it("cloneBoardDefinition returns a deep copy", () => {
    const def = {
      ...emptyBoardDefinition(),
      elements: [statAt(0)],
    };
    const copy = cloneBoardDefinition(def);
    expect(copy).toEqual(def);
    copy.elements[0]!.placeId = 99;
    expect(def.elements[0]!.placeId).toBe(0);
  });
});
