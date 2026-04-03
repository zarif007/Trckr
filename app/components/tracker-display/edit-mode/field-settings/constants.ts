/**
 * Shared constants and pure helpers for the field settings dialog.
 */

import type { FieldValidationRule, ExprNode } from "@/lib/functions/types";
import type { TrackerFieldType } from "../../types";
import { FIELD_RULES_OPERATORS } from "@/lib/dynamic-options/functions/all-operators";

export const FIELD_RULES_ACTION_LABELS: Record<
  "isHidden" | "isRequired" | "isDisabled",
  string
> = {
  isHidden: "Hide",
  isRequired: "Require",
  isDisabled: "Disable",
};

export const FIELD_RULES_OPERATOR_LABELS: Record<
  (typeof FIELD_RULES_OPERATORS)[number],
  string
> = {
  eq: "Equals",
  neq: "Not equal",
  gt: "Greater than",
  gte: "Greater or equal",
  lt: "Less than",
  lte: "Less or equal",
  in: "In list",
  not_in: "Not in list",
  contains: "Contains",
  not_contains: "Does not contain",
  is_empty: "Is empty",
  not_empty: "Is not empty",
  starts_with: "Starts with",
  ends_with: "Ends with",
};

export const RULE_TYPES: Array<FieldValidationRule["type"]> = [
  "required",
  "min",
  "max",
  "minLength",
  "maxLength",
  "expr",
];

export const RULE_TYPE_LABELS: Record<FieldValidationRule["type"], string> = {
  required: "Required",
  min: "Minimum value",
  max: "Maximum value",
  minLength: "Minimum length",
  maxLength: "Maximum length",
  expr: "Custom expression",
};

export const NUMERIC_TYPES: TrackerFieldType[] = [
  "number",
  "currency",
  "percentage",
  "rating",
];
export const TEXT_TYPES: TrackerFieldType[] = [
  "string",
  "text",
  "link",
  "email",
  "phone",
  "url",
];

export const defaultExpr: ExprNode = { op: "const", value: true };
export const defaultCalculationExpr: ExprNode = { op: "const", value: 0 };

export const GROUP_ORDER = [
  "Text",
  "Numbers",
  "Date & time",
  "Choice",
  "Other",
] as const;

export function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function ensureRuleDefaults(
  rule: FieldValidationRule,
): FieldValidationRule {
  if (rule.type === "expr")
    return rule.expr ? rule : { ...rule, expr: defaultExpr };
  if (
    rule.type === "min" ||
    rule.type === "max" ||
    rule.type === "minLength" ||
    rule.type === "maxLength"
  ) {
    return typeof rule.value === "number" ? rule : { ...rule, value: 0 };
  }
  return rule;
}

export type FieldDataSource =
  | { type: "manual" }
  | { type: "calculation" }
  | { type: "auto_populate"; fromPath: string };

export function sourceEntryId(entry: FieldDataSource): string {
  if (entry.type === "manual") return "manual";
  if (entry.type === "calculation") return "calculation";
  return `auto_populate:${entry.fromPath}`;
}

export function sourceEntryLabel(
  entry: FieldDataSource,
  pathLabelFn: (path: string) => string,
  /** When set, used for auto_populate rows (e.g. include linked tracker name for foreign bindings). */
  autoPopulatePathLabelFn?: (fromPath: string) => string,
): string {
  if (entry.type === "manual") return "Manual";
  if (entry.type === "calculation") return "Calculation";
  const labelFn = autoPopulatePathLabelFn ?? pathLabelFn;
  return `Auto-populate from ${labelFn(entry.fromPath)}`;
}
