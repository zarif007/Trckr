import type { AvailableField } from '@/app/components/tracker-display/edit-mode/expr-types'

export interface ExprPromptInputs {
  prompt: string
  gridId: string
  fieldId: string
  purpose: 'validation' | 'calculation'
  availableFields: AvailableField[]
}

export function buildSystemPrompt(purpose: 'validation' | 'calculation'): string {
  const purposeRules =
    purpose === 'calculation'
      ? '- The expression should compute the target field value (number/string/boolean/etc), not a validation boolean unless explicitly requested.'
      : '- The expression should evaluate to a boolean/truthy result suitable for validation checks.'
  return `
You are generating a JSON expression AST for ${purpose === 'calculation' ? 'field calculation' : 'field validation'}.

Rules:
- Output ONLY valid JSON with a single top-level object: { "expr": <ExprNode> }.
- Supported ops: const, field, add, mul, sub, div, eq, neq, gt, gte, lt, lte.
- "field" nodes must use fieldId in "gridId.fieldId" format from the provided list.
- Prefer same-grid field references unless explicitly instructed otherwise.
${purposeRules}
- Use canonical shapes:
  - const: { "op": "const", "value": <literal> }
  - field: { "op": "field", "fieldId": "grid.field" }
  - add/mul: { "op": "add"|"mul", "args": [<ExprNode>, <ExprNode>] }
  - sub/div/eq/neq/gt/gte/lt/lte: { "op": "<op>", "left": <ExprNode>, "right": <ExprNode> }
- Do not include any extra keys or explanations.
`.trim()
}

function formatAvailableFields(fields: AvailableField[]): string {
  if (!fields.length) return 'None'
  return fields
    .map((f) => `${f.fieldId}${f.label ? ` (${f.label})` : ''}${f.dataType ? ` : ${f.dataType}` : ''}`)
    .join('\n')
}

export function buildUserPrompt(inputs: ExprPromptInputs): string {
  const { prompt, gridId, fieldId, purpose, availableFields } = inputs
  const fieldList = formatAvailableFields(availableFields)
  return `
Mode: ${purpose}
Target grid: ${gridId}
Target field: ${fieldId}
Target field path: ${gridId}.${fieldId}

Available fields:
${fieldList}

User prompt:
${prompt}

Generate the expression AST.
`.trim()
}

export function deriveAvailableFields(currentTracker: unknown, gridId: string): AvailableField[] {
  if (!currentTracker || typeof currentTracker !== 'object' || Array.isArray(currentTracker)) return []
  const tracker = currentTracker as Record<string, unknown>
  const layoutNodes = Array.isArray(tracker.layoutNodes) ? tracker.layoutNodes : []
  const fields = Array.isArray(tracker.fields) ? tracker.fields : []
  const fieldsById = new Map(
    fields
      .filter((f): f is Record<string, unknown> => f && typeof f === 'object')
      .map((f) => [String(f.id ?? ''), f])
  )

  const ordered = layoutNodes
    .filter((n): n is Record<string, unknown> => n && typeof n === 'object')
    .filter((n) => n.gridId === gridId)
    .sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : 0
      const bo = typeof b.order === 'number' ? b.order : 0
      return ao - bo
    })

  const seen = new Set<string>()
  const out: AvailableField[] = []
  for (const node of ordered) {
    const fieldId = String(node.fieldId ?? '').trim()
    if (!fieldId || seen.has(fieldId)) continue
    seen.add(fieldId)
    const field = fieldsById.get(fieldId)
    const label = field?.ui && typeof field.ui === 'object'
      ? String((field.ui as Record<string, unknown>).label ?? fieldId)
      : fieldId
    const dataType = field && typeof field.dataType === 'string' ? field.dataType : undefined
    out.push({
      fieldId: `${gridId}.${fieldId}`,
      label,
      dataType,
    })
  }

  return out
}
