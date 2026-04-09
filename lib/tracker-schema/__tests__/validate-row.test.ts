import { describe, it, expect, beforeEach } from "vitest";
import {
  getCompiledValidator,
  validateRowData,
  clearValidatorCache,
} from "../validate-row";

const TRACKER = "tracker-1";
const GRID = "grid-1";

function makeFields(defs: Array<{ slug: string; dataType: string }>) {
  return defs.map((d) => ({ ...d }));
}

function makeLayouts(fieldSlugs: string[], gridId = GRID) {
  return fieldSlugs.map((slug) => ({ gridId, fieldId: slug }));
}

describe("validate-row", () => {
  beforeEach(() => {
    clearValidatorCache();
  });

  describe("number fields", () => {
    const fields = makeFields([{ slug: "amount", dataType: "number" }]);
    const layouts = makeLayouts(["amount"]);

    it("accepts numbers", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ amount: 42 }, v).valid).toBe(true);
    });

    it("accepts numeric strings", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ amount: "3.14" }, v).valid).toBe(true);
    });

    it("accepts empty values", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ amount: null }, v).valid).toBe(true);
      expect(validateRowData({ amount: "" }, v).valid).toBe(true);
      expect(validateRowData({}, v).valid).toBe(true);
    });

    it("rejects non-numeric values", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ amount: "abc" }, v);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fieldSlug).toBe("amount");
    });
  });

  describe("date fields", () => {
    const fields = makeFields([{ slug: "due", dataType: "date" }]);
    const layouts = makeLayouts(["due"]);

    it("accepts valid ISO date strings", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ due: "2025-01-15" }, v).valid).toBe(true);
    });

    it("rejects invalid dates", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ due: "not-a-date" }, v);
      expect(result.valid).toBe(false);
    });
  });

  describe("boolean fields", () => {
    const fields = makeFields([{ slug: "active", dataType: "boolean" }]);
    const layouts = makeLayouts(["active"]);

    it("accepts booleans and truthy variants", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ active: true }, v).valid).toBe(true);
      expect(validateRowData({ active: false }, v).valid).toBe(true);
      expect(validateRowData({ active: "true" }, v).valid).toBe(true);
      expect(validateRowData({ active: 0 }, v).valid).toBe(true);
      expect(validateRowData({ active: 1 }, v).valid).toBe(true);
    });

    it("rejects non-boolean values", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ active: "yes" }, v);
      expect(result.valid).toBe(false);
    });
  });

  describe("select/multi-select fields", () => {
    const fields = makeFields([{ slug: "status", dataType: "multi-select" }]);
    const layouts = makeLayouts(["status"]);

    it("accepts strings and arrays", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ status: "open" }, v).valid).toBe(true);
      expect(validateRowData({ status: ["open", "closed"] }, v).valid).toBe(true);
    });

    it("rejects non-string non-array values", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ status: 42 }, v);
      expect(result.valid).toBe(false);
    });
  });

  describe("json fields", () => {
    const fields = makeFields([{ slug: "meta", dataType: "json" }]);
    const layouts = makeLayouts(["meta"]);

    it("accepts objects and valid JSON strings", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ meta: { a: 1 } }, v).valid).toBe(true);
      expect(validateRowData({ meta: '{"a":1}' }, v).valid).toBe(true);
    });

    it("rejects invalid JSON strings", () => {
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ meta: "not json {" }, v);
      expect(result.valid).toBe(false);
    });
  });

  describe("unknown field types", () => {
    it("passes validation for unrecognised types", () => {
      const fields = makeFields([{ slug: "notes", dataType: "richtext" }]);
      const layouts = makeLayouts(["notes"]);
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(validateRowData({ notes: "<b>hello</b>" }, v).valid).toBe(true);
    });
  });

  describe("multiple fields", () => {
    it("reports errors for multiple invalid fields", () => {
      const fields = makeFields([
        { slug: "amount", dataType: "number" },
        { slug: "active", dataType: "boolean" },
      ]);
      const layouts = makeLayouts(["amount", "active"]);
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ amount: "abc", active: "yes" }, v);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("caching", () => {
    it("returns same validator for same version", () => {
      const fields = makeFields([{ slug: "x", dataType: "number" }]);
      const layouts = makeLayouts(["x"]);
      const v1 = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const v2 = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      expect(v1).toBe(v2);
    });

    it("recompiles when version changes", () => {
      const fields = makeFields([{ slug: "x", dataType: "number" }]);
      const layouts = makeLayouts(["x"]);
      const v1 = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const v2 = getCompiledValidator(TRACKER, GRID, 2, fields, layouts);
      expect(v1).not.toBe(v2);
    });
  });

  describe("grid scoping", () => {
    it("only validates fields assigned to the target grid", () => {
      const fields = makeFields([
        { slug: "a", dataType: "number" },
        { slug: "b", dataType: "number" },
      ]);
      const layouts = [
        { gridId: GRID, fieldId: "a" },
        { gridId: "other-grid", fieldId: "b" },
      ];
      const v = getCompiledValidator(TRACKER, GRID, 1, fields, layouts);
      const result = validateRowData({ a: "bad", b: "bad" }, v);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fieldSlug).toBe("a");
    });
  });
});
