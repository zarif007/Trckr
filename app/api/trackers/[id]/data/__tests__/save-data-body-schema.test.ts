import { describe, expect, it } from "vitest";
import { saveDataBodySchema } from "../save-data-body-schema";

describe("saveDataBodySchema", () => {
  it("accepts minimal valid payload with data object", () => {
    const r = saveDataBodySchema.safeParse({ data: { grid: [] } });
    expect(r.success).toBe(true);
  });

  it("allows optional label and branchName", () => {
    const r = saveDataBodySchema.safeParse({
      data: { g: [{}] },
      label: "Backup",
      branchName: "feature",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.label).toBe("Backup");
      expect(r.data.branchName).toBe("feature");
    }
  });
});
