import { beforeEach, describe, expect, it } from "vitest";
import { clearValidationCache, validateField } from "../index";

describe("Validation severity (errors vs warnings)", () => {
  beforeEach(() => {
    clearValidationCache();
  });

  it("treats missing severity as error by default", () => {
    const result = validateField({
      value: 5,
      fieldId: "qty",
      fieldType: "number",
      rules: [{ type: "min", value: 10 }],
    });

    expect(result.hasError).toBe(true);
    expect(result.hasWarning).toBe(false);
    expect(result.error).toBe("Must be at least 10");
    expect(result.warning).toBeNull();
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("error");
  });

  it("respects explicit error severity", () => {
    const result = validateField({
      value: 5,
      fieldId: "qty",
      fieldType: "number",
      rules: [{ type: "min", value: 10, severity: "error" }],
    });

    expect(result.hasError).toBe(true);
    expect(result.hasWarning).toBe(false);
    expect(result.error).toBe("Must be at least 10");
  });

  it("respects warning severity", () => {
    const result = validateField({
      value: 5,
      fieldId: "qty",
      fieldType: "number",
      rules: [
        {
          type: "min",
          value: 10,
          severity: "warning",
          message: "Low quantity",
        },
      ],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.error).toBeNull();
    expect(result.warning).toBe("Low quantity");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("warning");
  });

  it("returns both error and warning when both exist", () => {
    const result = validateField({
      value: 5,
      fieldId: "qty",
      fieldType: "number",
      rules: [
        { type: "min", value: 3, severity: "error", message: "Too low" },
        {
          type: "min",
          value: 10,
          severity: "warning",
          message: "Consider increasing",
        },
      ],
    });

    // 5 >= 3 (passes error), 5 < 10 (fails warning)
    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.error).toBeNull();
    expect(result.warning).toBe("Consider increasing");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("warning");
  });

  it("prioritizes errors over warnings in issues array", () => {
    const result = validateField({
      value: 150,
      fieldId: "qty",
      fieldType: "number",
      rules: [
        { type: "min", value: 10, severity: "warning", message: "Low" },
        { type: "max", value: 100, severity: "error", message: "Too high" },
      ],
    });

    // 150 >= 10 (passes warning), 150 > 100 (fails error)
    expect(result.hasError).toBe(true);
    expect(result.hasWarning).toBe(false);
    expect(result.error).toBe("Too high");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("error");
    expect(result.issues[0].message).toBe("Too high");
  });

  it("collects multiple issues with different severities", () => {
    const result = validateField({
      value: 2,
      fieldId: "qty",
      fieldType: "number",
      rules: [
        { type: "min", value: 5, severity: "error", message: "Error 1" },
        { type: "min", value: 10, severity: "warning", message: "Warning 1" },
        { type: "min", value: 3, severity: "error", message: "Error 2" },
        { type: "min", value: 15, severity: "warning", message: "Warning 2" },
      ],
    });

    // 2 < 5 (error), 2 < 10 (warning), 2 < 3 (error), 2 < 15 (warning)
    expect(result.hasError).toBe(true);
    expect(result.hasWarning).toBe(true);
    expect(result.issues).toHaveLength(4);

    // Errors should come first
    expect(result.issues[0].severity).toBe("error");
    expect(result.issues[1].severity).toBe("error");
    expect(result.issues[2].severity).toBe("warning");
    expect(result.issues[3].severity).toBe("warning");

    expect(result.error).toBe("Error 1"); // First error
    expect(result.warning).toBe("Warning 1"); // First warning
  });

  it("works with required validation severity", () => {
    const result = validateField({
      value: "",
      fieldId: "name",
      fieldType: "string",
      rules: [
        { type: "required", severity: "warning", message: "Recommended" },
      ],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.warning).toBe("Recommended");
  });

  it("works with maxLength validation severity", () => {
    const result = validateField({
      value: "this is a long text",
      fieldId: "description",
      fieldType: "string",
      rules: [
        {
          type: "maxLength",
          value: 10,
          severity: "warning",
          message: "Keep it short",
        },
      ],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.warning).toBe("Keep it short");
  });

  it("works with minLength validation severity", () => {
    const result = validateField({
      value: "Hi",
      fieldId: "bio",
      fieldType: "text",
      rules: [
        {
          type: "minLength",
          value: 10,
          severity: "warning",
          message: "Add more details",
        },
      ],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.warning).toBe("Add more details");
  });

  it("returns no issues when all validations pass", () => {
    const result = validateField({
      value: 50,
      fieldId: "qty",
      fieldType: "number",
      rules: [
        { type: "min", value: 10, severity: "error" },
        { type: "max", value: 100, severity: "warning" },
      ],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(false);
    expect(result.error).toBeNull();
    expect(result.warning).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("handles disabled field (no validation)", () => {
    const result = validateField({
      value: 5,
      fieldId: "qty",
      fieldType: "number",
      config: { isDisabled: true },
      rules: [{ type: "min", value: 10, severity: "error" }],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it("handles hidden field (no validation)", () => {
    const result = validateField({
      value: 5,
      fieldId: "qty",
      fieldType: "number",
      config: { isHidden: true },
      rules: [{ type: "min", value: 10, severity: "error" }],
    });

    expect(result.hasError).toBe(false);
    expect(result.hasWarning).toBe(false);
    expect(result.issues).toHaveLength(0);
  });
});
