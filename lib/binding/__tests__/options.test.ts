import { describe, expect, it } from "vitest";
import {
  resolveFieldOptionsLegacy,
  resolveFieldOptionsV2,
  resolveFieldOptionsV2Async,
} from "../options";

describe("resolveFieldOptionsLegacy", () => {
  it("returns undefined for null field", () => {
    expect(resolveFieldOptionsLegacy(null)).toBeUndefined();
  });

  it("maps inline config.options to ResolvedOption shape", () => {
    const opts = resolveFieldOptionsLegacy({
      id: "f1",
      dataType: "options",
      config: {
        options: [{ label: "A", value: "a" }],
      },
    });
    expect(opts).toEqual([
      expect.objectContaining({
        label: "A",
        value: "a",
        id: "a",
      }),
    ]);
  });
});

describe("resolveFieldOptionsV2", () => {
  it("prefers binding + gridData over legacy when binding exists", () => {
    const gridData = {
      opt_grid: [{ opt_label: "From row", opt_value: "v1" }],
    };
    const opts = resolveFieldOptionsV2(
      "tab1",
      "main",
      { id: "status", dataType: "options", config: { options: [{ label: "Inline", value: "i" }] } },
      {
        "main.status": {
          optionsGrid: "opt_grid",
          labelField: "opt_grid.opt_label",
          fieldMappings: [
            { from: "opt_grid.opt_value", to: "main.status" },
          ],
        },
      },
      gridData,
    );
    expect(opts?.[0]?.label).toBe("From row");
    expect(opts?.[0]?.value).toBe("v1");
  });

  it("falls back to legacy inline options when no binding", () => {
    const opts = resolveFieldOptionsV2(
      "tab1",
      "main",
      {
        id: "status",
        dataType: "options",
        config: { options: [{ label: "Only", value: "1" }] },
      },
      {},
      {},
    );
    expect(opts?.map((o) => o.label)).toEqual(["Only"]);
  });

  it("returns empty array for dynamic_select without trackerContext", () => {
    const opts = resolveFieldOptionsV2(
      "t",
      "g",
      {
        id: "dyn",
        dataType: "dynamic_select",
        config: { dynamicOptionsFunction: "built_in_static" },
      },
      {},
      {},
      undefined,
    );
    expect(opts).toEqual([]);
  });
});

describe("resolveFieldOptionsV2Async", () => {
  it("delegates non-dynamic fields to the same result as sync", async () => {
    const field = {
      id: "status",
      dataType: "options",
      config: { options: [{ label: "L", value: "v" }] },
    };
    const sync = resolveFieldOptionsV2("t", "main", field, {}, {});
    const asyncResult = await resolveFieldOptionsV2Async(
      "t",
      "main",
      field,
      {},
      {},
    );
    expect(asyncResult).toEqual(sync);
  });
});
