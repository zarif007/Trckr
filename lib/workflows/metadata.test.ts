import { describe, expect, it } from "vitest";
import { extractTrackerMetadata } from "./metadata";

describe("extractTrackerMetadata", () => {
  it("returns empty grids when schema is undefined", () => {
    expect(
      extractTrackerMetadata({
        id: "t1",
        name: "Tracker",
        schema: undefined,
      }).grids
    ).toEqual([]);
  });

  it("returns empty grids when schema is null", () => {
    expect(
      extractTrackerMetadata({
        id: "t1",
        name: "Tracker",
        schema: null,
      }).grids
    ).toEqual([]);
  });

  it("parses schema when it is a JSON string", () => {
    const schema = JSON.stringify({
      tabs: [
        {
          sections: [
            {
              fieldGroups: [
                {
                  fieldGroupId: "grid_1",
                  label: "Grid 1",
                  displayMode: "grid",
                  fields: [{ fieldId: "f1", label: "Field 1", dataType: "text" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const meta = extractTrackerMetadata({
      id: "t1",
      name: "Tracker",
      schema,
    });

    expect(meta.grids).toEqual([
      {
        gridId: "grid_1",
        label: "Grid 1",
        fields: [{ fieldId: "f1", label: "Field 1", dataType: "text" }],
      },
    ]);
  });

  it("returns empty grids when schema is an invalid JSON string", () => {
    expect(
      extractTrackerMetadata({
        id: "t1",
        name: "Tracker",
        schema: "{not json",
      }).grids
    ).toEqual([]);
  });
});

