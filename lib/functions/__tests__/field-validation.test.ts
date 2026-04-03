import { describe, expect, it } from "vitest";
import {
  compileValidationPlan,
  getValidationError,
  getValidationErrorFromCompiled,
} from "@/lib/field-validation";

describe("field validation compiled plans", () => {
  it("compiled validation matches wrapper behavior", () => {
    const input = {
      fieldId: "sales_grid.amount",
      fieldType: "number",
      config: { min: 0 },
      rules: [
        {
          type: "expr" as const,
          expr: {
            op: "gte" as const,
            left: { op: "field" as const, fieldId: "sales_grid.amount" },
            right: { op: "const" as const, value: 10 },
          },
          message: "Amount must be at least 10",
        },
      ],
    };
    const rowValues = { sales_grid: null, "sales_grid.amount": 5 };

    const wrapped = getValidationError({
      ...input,
      value: 5,
      rowValues,
    });
    const plan = compileValidationPlan(input);
    const compiled = getValidationErrorFromCompiled({
      plan,
      value: 5,
      rowValues,
    });

    expect(compiled).toBe(wrapped);
    expect(compiled).toBe("Amount must be at least 10");
  });

  it("returns null for disabled fields and keeps numeric fallback", () => {
    const disabled = getValidationError({
      fieldId: "sales_grid.rate",
      fieldType: "number",
      value: "not-a-number",
      config: { isDisabled: true, min: 1 },
    });
    expect(disabled).toBeNull();

    const numericFallback = getValidationError({
      fieldId: "sales_grid.rate",
      fieldType: "number",
      value: "not-a-number",
      config: { min: 0 },
    });
    expect(numericFallback).toBe("Enter a valid number");
  });

  it("preserves early-exit behavior with no rules/config", () => {
    const result = getValidationError({
      fieldId: "sales_grid.rate",
      fieldType: "number",
      value: "not-a-number",
      config: {},
      rules: [],
    });
    expect(result).toBeNull();
  });

  it("validates new notion-like field types", () => {
    expect(
      getValidationError({
        fieldId: "profile.email",
        fieldType: "email",
        value: "not-an-email",
        config: { isRequired: false },
      }),
    ).toBe("Enter a valid email address");

    expect(
      getValidationError({
        fieldId: "profile.website",
        fieldType: "url",
        value: "foo",
        config: { isRequired: false },
      }),
    ).toBe("Enter a valid URL");

    expect(
      getValidationError({
        fieldId: "tasks.status",
        fieldType: "status",
        value: "In review",
        config: { statusOptions: ["Todo", "Done"] },
      }),
    ).toBe("Value must match a configured status option");

    expect(
      getValidationError({
        fieldId: "tasks.rating",
        fieldType: "rating",
        value: 4.7,
        config: { ratingMax: 5, numberStep: 0.5 },
      }),
    ).toBe("Rating must use increments of 0.5");
  });
});
