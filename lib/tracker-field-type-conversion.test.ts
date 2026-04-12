import { describe, expect, it } from "vitest";
import {
  fieldTypeFamily,
  findDisallowedFieldDataTypeChanges,
  isFieldDataTypeChangeAllowed,
  listAllowedTargetDataTypes,
} from "./tracker-field-type-conversion";

describe("isFieldDataTypeChangeAllowed", () => {
  it("allows same type", () => {
    expect(isFieldDataTypeChangeAllowed("string", "string")).toBe(true);
  });

  it("disallows string → number", () => {
    expect(isFieldDataTypeChangeAllowed("string", "number")).toBe(false);
  });

  it("allows number → string", () => {
    expect(isFieldDataTypeChangeAllowed("number", "string")).toBe(true);
  });

  it("allows text family cross-conversion", () => {
    expect(isFieldDataTypeChangeAllowed("string", "email")).toBe(true);
    expect(isFieldDataTypeChangeAllowed("url", "text")).toBe(true);
  });

  it("allows numeric family cross-conversion", () => {
    expect(isFieldDataTypeChangeAllowed("number", "currency")).toBe(true);
    expect(isFieldDataTypeChangeAllowed("rating", "percentage")).toBe(true);
  });

  it("disallows number → date", () => {
    expect(isFieldDataTypeChangeAllowed("number", "date")).toBe(false);
  });

  it("disallows text → boolean", () => {
    expect(isFieldDataTypeChangeAllowed("string", "boolean")).toBe(false);
  });

  it("allows choiceSingle cross within family", () => {
    expect(isFieldDataTypeChangeAllowed("options", "status")).toBe(true);
    expect(isFieldDataTypeChangeAllowed("status", "dynamic_select")).toBe(true);
  });

  it("allows choiceMulti cross within family", () => {
    expect(isFieldDataTypeChangeAllowed("multiselect", "dynamic_multiselect")).toBe(
      true,
    );
  });

  it("disallows options → multiselect (cardinality)", () => {
    expect(isFieldDataTypeChangeAllowed("options", "multiselect")).toBe(false);
  });

  it("disallows person → string", () => {
    expect(isFieldDataTypeChangeAllowed("person", "string")).toBe(false);
  });
});

describe("fieldTypeFamily", () => {
  it("classifies known types", () => {
    expect(fieldTypeFamily("string")).toBe("text");
    expect(fieldTypeFamily("number")).toBe("numeric");
    expect(fieldTypeFamily("options")).toBe("choiceSingle");
  });
});

describe("listAllowedTargetDataTypes", () => {
  it("excludes number when from is string", () => {
    const list = listAllowedTargetDataTypes("string");
    expect(list).toContain("string");
    expect(list).toContain("email");
    expect(list).not.toContain("number");
  });

  it("includes string when from is number", () => {
    const list = listAllowedTargetDataTypes("number");
    expect(list).toContain("string");
    expect(list).toContain("number");
  });
});

describe("findDisallowedFieldDataTypeChanges", () => {
  it("ignores new slugs", () => {
    const v = findDisallowedFieldDataTypeChanges({
      existingBySlug: new Map([["a", "string"]]),
      incomingFields: [{ slug: "b", dataType: "number" }],
    });
    expect(v).toEqual([]);
  });

  it("flags string → number for existing slug", () => {
    const v = findDisallowedFieldDataTypeChanges({
      existingBySlug: new Map([["age", "string"]]),
      incomingFields: [{ slug: "age", dataType: "number" }],
    });
    expect(v).toEqual([
      { slug: "age", from: "string", to: "number" },
    ]);
  });

  it("allows number → string for existing slug", () => {
    const v = findDisallowedFieldDataTypeChanges({
      existingBySlug: new Map([["age", "number"]]),
      incomingFields: [{ slug: "age", dataType: "string" }],
    });
    expect(v).toEqual([]);
  });
});
