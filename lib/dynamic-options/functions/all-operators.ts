/**
 * Dynamic options: all operators (e.g. for field rules).
 */

import type { DynamicOptionsContext, DynamicOption } from "../types";

export const ID = "all_operators";

export const FIELD_RULES_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "contains",
  "not_contains",
  "is_empty",
  "not_empty",
  "starts_with",
  "ends_with",
] as const;

const OPERATORS = FIELD_RULES_OPERATORS;

export function allOperators(context: DynamicOptionsContext): DynamicOption[] {
  void context;
  return OPERATORS.map((op) => ({
    value: op,
    label: op,
    id: op,
  }));
}
