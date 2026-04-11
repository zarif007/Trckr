import { describe, expect, it } from "vitest";
import {
  localGridSnapshotHasGridSlice,
  resolveBindingSelectSourceDisplay,
  usesForeignBindingOptionsSnapshot,
} from "../binding-select-source-display";

describe("usesForeignBindingOptionsSnapshot", () => {
  it("returns false when source is empty", () => {
    expect(usesForeignBindingOptionsSnapshot("", "t1")).toBe(false);
    expect(usesForeignBindingOptionsSnapshot(undefined, "t1")).toBe(false);
  });

  it("returns false for self binding markers", () => {
    expect(usesForeignBindingOptionsSnapshot("ThisTracker", "t1")).toBe(false);
    expect(usesForeignBindingOptionsSnapshot("__self__", "t1")).toBe(false);
  });

  it("returns false when source is the current tracker id", () => {
    expect(usesForeignBindingOptionsSnapshot("abc-uuid", "abc-uuid")).toBe(
      false,
    );
  });

  it("returns true for another tracker id", () => {
    expect(usesForeignBindingOptionsSnapshot("foreign-id", "local-id")).toBe(
      true,
    );
  });
});

describe("localGridSnapshotHasGridSlice", () => {
  it("returns false when key is missing", () => {
    expect(localGridSnapshotHasGridSlice({ other: [] }, "g1")).toBe(false);
  });

  it("returns true for empty row array", () => {
    expect(localGridSnapshotHasGridSlice({ g1: [] }, "g1")).toBe(true);
  });
});

describe("resolveBindingSelectSourceDisplay", () => {
  const schemaHas = (id: string) => id === "supplier_grid";
  const nameOf = (id: string) => (id === "supplier_grid" ? "Supplier" : undefined);

  it("loads for foreign until snapshot exists", () => {
    const sid = "foreign-schema";
    expect(
      resolveBindingSelectSourceDisplay({
        optionsSourceSchemaId: sid,
        optionsGridId: "supplier_grid",
        currentTrackerSchemaId: "local",
        localGridData: {},
        isGridInLocalSchema: () => true,
        getLocalOptionsGridDisplayName: nameOf,
        foreignGridDataBySchemaId: null,
        foreignSchemaBySchemaId: null,
      }),
    ).toEqual({
      usesForeignBindingSnapshot: true,
      isLoadingOptions: true,
      optionsGridDisplayName: undefined,
    });

    expect(
      resolveBindingSelectSourceDisplay({
        optionsSourceSchemaId: sid,
        optionsGridId: "supplier_grid",
        currentTrackerSchemaId: "local",
        localGridData: {},
        isGridInLocalSchema: () => true,
        getLocalOptionsGridDisplayName: nameOf,
        foreignGridDataBySchemaId: {
          [sid]: { supplier_grid: [{ row_id: "1", name: "Acme" }] },
        },
        foreignSchemaBySchemaId: {
          [sid]: {
            grids: [{ id: "supplier_grid", name: "Supplier" }],
          },
        },
      }),
    ).toEqual({
      usesForeignBindingSnapshot: true,
      isLoadingOptions: false,
      optionsGridDisplayName: "Supplier",
    });
  });

  it("does not require foreign snapshot for self-bound current tracker id", () => {
    const self = "same-id";
    expect(
      resolveBindingSelectSourceDisplay({
        optionsSourceSchemaId: self,
        optionsGridId: "supplier_grid",
        currentTrackerSchemaId: self,
        localGridData: { supplier_grid: [] },
        isGridInLocalSchema: schemaHas,
        getLocalOptionsGridDisplayName: nameOf,
        foreignGridDataBySchemaId: null,
        foreignSchemaBySchemaId: null,
      }).isLoadingOptions,
    ).toBe(false);
  });

  it("loads locally when schema knows grid but snapshot has no key yet", () => {
    expect(
      resolveBindingSelectSourceDisplay({
        optionsSourceSchemaId: undefined,
        optionsGridId: "supplier_grid",
        currentTrackerSchemaId: "t1",
        localGridData: {},
        isGridInLocalSchema: schemaHas,
        getLocalOptionsGridDisplayName: nameOf,
      }),
    ).toEqual({
      usesForeignBindingSnapshot: false,
      isLoadingOptions: true,
      optionsGridDisplayName: undefined,
    });

    expect(
      resolveBindingSelectSourceDisplay({
        optionsSourceSchemaId: undefined,
        optionsGridId: "supplier_grid",
        currentTrackerSchemaId: "t1",
        localGridData: { supplier_grid: [] },
        isGridInLocalSchema: schemaHas,
        getLocalOptionsGridDisplayName: nameOf,
      }),
    ).toEqual({
      usesForeignBindingSnapshot: false,
      isLoadingOptions: false,
      optionsGridDisplayName: "Supplier",
    });
  });

  it("returns not loading when grid not in schema (invalid id)", () => {
    expect(
      resolveBindingSelectSourceDisplay({
        optionsSourceSchemaId: undefined,
        optionsGridId: "ghost_grid",
        currentTrackerSchemaId: "t1",
        localGridData: {},
        isGridInLocalSchema: schemaHas,
        getLocalOptionsGridDisplayName: nameOf,
      }).isLoadingOptions,
    ).toBe(false);
  });
});
