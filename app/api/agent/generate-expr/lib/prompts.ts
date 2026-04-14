import type { AvailableField } from "@/app/components/tracker-display/edit-mode";

export interface ExprPromptInputs {
  prompt: string;
  gridId: string;
  fieldId: string;
  purpose: "validation" | "calculation" | "field-rule";
  availableFields: AvailableField[];
}

export function buildSystemPrompt(
  purpose: ExprPromptInputs["purpose"],
  gridId: string,
): string {
  const purposeRules =
    purpose === "validation"
      ? "- The expression should evaluate to a boolean/truthy result suitable for validation checks."
      : purpose === "calculation"
        ? "- The expression should compute the target field value (number/string/boolean/etc), not a validation boolean unless explicitly requested."
        : [
            "- The expression evaluates to the new value for the target field property:",
            " - visibility/required/disabled: boolean",
            " - label: string",
            " - options: array of { label: string, value: unknown }",
            " - value: any type matching the target field",
          ].join("\n");
  const taskLabel =
    purpose === "validation"
      ? "field validation"
      : purpose === "calculation"
        ? "field calculation"
        : "field rule outcome";

  return `
You are generating a JSON expression AST for ${taskLabel}.

Rules:
- Output ONLY valid JSON with a single top-level object: { "expr": <ExprNode> }.
- "field" nodes must use fieldId in "gridId.fieldId" format from the provided list.
- **CRITICAL: Regular field references in arithmetic/comparison operations must stay within target grid "${gridId}".**
- **For cross-grid aggregation (summing values from another grid), use sum/accumulate/count with sourceFieldId, NOT field references in arithmetic.**
 - ✓ CORRECT: { "op": "sum", "sourceFieldId": "other_grid.amount" }
 - ✓ CORRECT: { "op": "accumulate", "sourceFieldId": "other_grid.price", "action": "add" }
 - ✗ WRONG: { "op": "mul", "args": [{ "op": "field", "fieldId": "other_grid.cost" }, quantity] }
- Only use operators listed in the "Supported operators" section above — do not generate other operators.
${purposeRules}

Supported operators and their canonical shapes:

DATA:
 - const: { "op": "const", "value": <literal> }
 - field: { "op": "field", "fieldId": "gridId.fieldId" } [MUST be within target grid]

ARITHMETIC:
 - add: { "op": "add", "args": [<ExprNode>, ...] }
 - mul: { "op": "mul", "args": [<ExprNode>, ...] }
 - sub: { "op": "sub", "left": <ExprNode>, "right": <ExprNode> }
 - div: { "op": "div", "left": <ExprNode>, "right": <ExprNode> }

COMPARISON (all binary left/right):
 - eq/neq/gt/gte/lt/lte: { "op": "<op>", "left": <ExprNode>, "right": <ExprNode> }

LOGIC:
 - and: { "op": "and", "args": [<ExprNode>, ...] }
 - or: { "op": "or", "args": [<ExprNode>, ...] }
 - not: { "op": "not", "arg": <ExprNode> }
 - if: { "op": "if", "cond": <ExprNode>, "then": <ExprNode>, "else": <ExprNode> }

TABLE AGGREGATION (for cross-grid summation):
 - sum: { "op": "sum", "sourceFieldId": "gridId.fieldId" } — sums all values in sourceFieldId
 - accumulate: { "op": "accumulate", "sourceFieldId": "gridId.fieldId", "action": "add"|"sub"|"mul", "startIndex": <number>, "endIndex": <number> } — cumulative operation across a grid
 - count: { "op": "count", "sourceFieldId": "gridId.fieldId" } — counts rows in a grid

Any slot that says <ExprNode> can be another operator (recursive nesting).
- Do not include any extra keys or explanations.
`.trim();
}

function formatAvailableFields(fields: AvailableField[]): string {
  if (!fields.length) return "None";
  return fields
    .map(
      (f) =>
        `${f.fieldId}${f.label ? ` (${f.label})` : ""}${f.dataType ? ` : ${f.dataType}` : ""}`,
    )
    .join("\n");
}

export function buildUserPrompt(inputs: ExprPromptInputs): string {
  const { prompt, gridId, fieldId, purpose, availableFields } = inputs;
  const fieldList = formatAvailableFields(availableFields);
  const modeLabel =
    purpose === "field-rule" ? "field rule outcome expression" : purpose;

  return `
Mode: ${modeLabel}
Target grid: ${gridId}
Target field: ${fieldId}
Target field path: ${gridId}.${fieldId}

Available fields:
${fieldList}

User prompt:
${prompt}

Generate the expression AST.
`.trim();
}

export function deriveAvailableFields(
  currentTracker: unknown,
  targetGridId: string,
): AvailableField[] {
  if (
    !currentTracker ||
    typeof currentTracker !== "object" ||
    Array.isArray(currentTracker)
  )
    return [];
  const tracker = currentTracker as Record<string, unknown>;
  const layoutNodes = Array.isArray(tracker.layoutNodes)
    ? tracker.layoutNodes
    : [];
  const fields = Array.isArray(tracker.fields) ? tracker.fields : [];
  const grids = Array.isArray(tracker.grids) ? tracker.grids : [];
  const fieldsById = new Map(
    fields
      .filter((f): f is Record<string, unknown> => f && typeof f === "object")
      .map((f) => [String(f.id ?? ""), f]),
  );
  const gridNames = new Map(
    grids
      .filter((g): g is Record<string, unknown> => g && typeof g === "object")
      .map((g) => [String(g.id ?? ""), String(g.name ?? g.id ?? "")]),
  );

  const allNodes = layoutNodes
    .filter((n): n is Record<string, unknown> => n && typeof n === "object")
    .sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : 0;
      const bo = typeof b.order === "number" ? b.order : 0;
      return ao - bo;
    });

  const seen = new Set<string>();
  const sameGrid: AvailableField[] = [];
  const otherGrids: AvailableField[] = [];

  for (const node of allNodes) {
    const nodeGridId = String(node.gridId ?? "").trim();
    const fieldId = String(node.fieldId ?? "").trim();
    if (!nodeGridId || !fieldId) continue;
    const path = `${nodeGridId}.${fieldId}`;
    if (seen.has(path)) continue;
    seen.add(path);

    const field = fieldsById.get(fieldId);
    const rawLabel =
      field?.ui && typeof field.ui === "object"
        ? String((field.ui as Record<string, unknown>).label ?? fieldId)
        : fieldId;
    const dataType =
      field && typeof field.dataType === "string" ? field.dataType : undefined;
    const gridLabel =
      nodeGridId !== targetGridId
        ? ` [${gridNames.get(nodeGridId) ?? nodeGridId}]`
        : "";
    const entry: AvailableField = {
      fieldId: path,
      label: `${rawLabel}${gridLabel}`,
      dataType,
    };

    if (nodeGridId === targetGridId) {
      sameGrid.push(entry);
    } else {
      otherGrids.push(entry);
    }
  }

  return [...sameGrid, ...otherGrids];
}
