import { describe, expect, it } from "vitest";
import { applyCalculationsForRow } from "@/lib/field-calculation";
import { validateField } from "@/lib/field-validation";
import type { ExprNode, FieldCalculationRule } from "@/lib/functions/types";

function calc(expr: ExprNode): FieldCalculationRule {
  return { expr };
}

describe("Indirect validation after calculations", () => {
  it("validates calculated field z = x + y with constraint z <= 10", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "grid.z": calc({
        op: "add",
        args: [
          { op: "field", fieldId: "grid.x" },
          { op: "field", fieldId: "grid.y" },
        ],
      }),
    };

    const row = { x: 5, y: 7, z: 0 };
    const calcResult = applyCalculationsForRow({
      gridId: "grid",
      row,
      calculations,
      changedFieldIds: ["x", "y"],
    });

    expect(calcResult.row.z).toBe(12);
    expect(calcResult.updatedFieldIds).toContain("z");

    const validationResult = validateField({
      value: calcResult.row.z,
      fieldId: "z",
      fieldType: "number",
      rules: [
        {
          type: "max",
          value: 10,
          message: "z must be ≤ 10",
        },
      ],
    });

    expect(validationResult.hasError).toBe(true);
    expect(validationResult.error).toBe("z must be ≤ 10");
  });

  it("validates calculated field with warning severity", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "order.total": calc({
        op: "mul",
        args: [
          { op: "field", fieldId: "order.price" },
          { op: "field", fieldId: "order.quantity" },
        ],
      }),
    };

    const row = { price: 150, quantity: 8, total: 0 };
    const calcResult = applyCalculationsForRow({
      gridId: "order",
      row,
      calculations,
      changedFieldIds: ["price", "quantity"],
    });

    expect(calcResult.row.total).toBe(1200);

    const validationResult = validateField({
      value: calcResult.row.total,
      fieldId: "total",
      fieldType: "number",
      rules: [
        {
          type: "max",
          value: 1000,
          severity: "warning",
          message: "Large order - please review",
        },
      ],
    });

    expect(validationResult.hasError).toBe(false);
    expect(validationResult.hasWarning).toBe(true);
    expect(validationResult.warning).toBe("Large order - please review");
  });

  it("validates multiple calculated fields", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "invoice.subtotal": calc({
        op: "mul",
        args: [
          { op: "field", fieldId: "invoice.price" },
          { op: "field", fieldId: "invoice.qty" },
        ],
      }),
      "invoice.tax": calc({
        op: "mul",
        args: [
          { op: "field", fieldId: "invoice.subtotal" },
          { op: "const", value: 0.1 },
        ],
      }),
      "invoice.total": calc({
        op: "add",
        args: [
          { op: "field", fieldId: "invoice.subtotal" },
          { op: "field", fieldId: "invoice.tax" },
        ],
      }),
    };

    const row = { price: 50, qty: 2, subtotal: 0, tax: 0, total: 0 };
    const calcResult = applyCalculationsForRow({
      gridId: "invoice",
      row,
      calculations,
      changedFieldIds: ["price", "qty"],
    });

    expect(calcResult.row.subtotal).toBe(100);
    expect(calcResult.row.tax).toBe(10);
    expect(calcResult.row.total).toBe(110);

    const validationResult = validateField({
      value: calcResult.row.total,
      fieldId: "total",
      fieldType: "number",
      rules: [
        { type: "max", value: 100, message: "Total exceeds limit" },
      ],
    });

    expect(validationResult.hasError).toBe(true);
    expect(validationResult.error).toBe("Total exceeds limit");
  });

  it("passes validation when calculated value is within bounds", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "grid.sum": calc({
        op: "add",
        args: [
          { op: "field", fieldId: "grid.a" },
          { op: "field", fieldId: "grid.b" },
        ],
      }),
    };

    const row = { a: 3, b: 4, sum: 0 };
    const calcResult = applyCalculationsForRow({
      gridId: "grid",
      row,
      calculations,
      changedFieldIds: ["a", "b"],
    });

    expect(calcResult.row.sum).toBe(7);

    const validationResult = validateField({
      value: calcResult.row.sum,
      fieldId: "sum",
      fieldType: "number",
      rules: [
        { type: "max", value: 10, message: "Sum must be ≤ 10" },
      ],
    });

    expect(validationResult.hasError).toBe(false);
    expect(validationResult.error).toBeNull();
  });

  it("validates with both min and max constraints on calculated field", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "product.discount_pct": calc({
        op: "mul",
        args: [
          {
            op: "div",
            left: { op: "field", fieldId: "product.discount" },
            right: { op: "field", fieldId: "product.price" },
          },
          { op: "const", value: 100 },
        ],
      }),
    };

    const row = { discount: 25, price: 100, discount_pct: 0 };
    const calcResult = applyCalculationsForRow({
      gridId: "product",
      row,
      calculations,
      changedFieldIds: ["discount", "price"],
    });

    expect(calcResult.row.discount_pct).toBe(25);

    const validationResult = validateField({
      value: calcResult.row.discount_pct,
      fieldId: "discount_pct",
      fieldType: "number",
      rules: [
        { type: "min", value: 0, message: "Discount cannot be negative" },
        {
          type: "max",
          value: 20,
          message: "Discount cannot exceed 20%",
        },
      ],
    });

    expect(validationResult.hasError).toBe(true);
    expect(validationResult.error).toBe("Discount cannot exceed 20%");
  });

  it("shows warning when calculated value exceeds soft limit", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "expense.amount_usd": calc({
        op: "mul",
        args: [
          { op: "field", fieldId: "expense.amount_local" },
          { op: "field", fieldId: "expense.exchange_rate" },
        ],
      }),
    };

    const row = { amount_local: 500, exchange_rate: 1.1, amount_usd: 0 };
    const calcResult = applyCalculationsForRow({
      gridId: "expense",
      row,
      calculations,
      changedFieldIds: ["amount_local", "exchange_rate"],
    });

    expect(calcResult.row.amount_usd).toBe(550);

    const validationResult = validateField({
      value: calcResult.row.amount_usd,
      fieldId: "amount_usd",
      fieldType: "number",
      rules: [
        {
          type: "max",
          value: 500,
          severity: "warning",
          message: "High expense - requires manager approval",
        },
        {
          type: "max",
          value: 1000,
          severity: "error",
          message: "Exceeds spending limit",
        },
      ],
    });

    expect(validationResult.hasError).toBe(false);
    expect(validationResult.hasWarning).toBe(true);
    expect(validationResult.warning).toBe(
      "High expense - requires manager approval",
    );
  });
});
