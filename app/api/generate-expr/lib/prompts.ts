import type { AvailableField } from '@/app/components/tracker-display/edit-mode'

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
- "field" nodes must use fieldId in "gridId.fieldId" format from the provided list.
- Prefer same-grid field references unless explicitly instructed otherwise.
- Cross-grid references are allowed when the prompt mentions fields from other grids.
${purposeRules}

Supported operators and their canonical shapes:
  - const: { "op": "const", "value": <literal> }
  - field: { "op": "field", "fieldId": "gridId.fieldId" }
  - add: { "op": "add", "args": [<ExprNode>, ...] }
  - mul: { "op": "mul", "args": [<ExprNode>, ...] }
  - sub: { "op": "sub", "left": <ExprNode>, "right": <ExprNode> }
  - div: { "op": "div", "left": <ExprNode>, "right": <ExprNode> }
  - eq/neq/gt/gte/lt/lte: { "op": "<op>", "left": <ExprNode>, "right": <ExprNode> }
  - and: { "op": "and", "args": [<ExprNode>, ...] }
  - or: { "op": "or", "args": [<ExprNode>, ...] }
  - not: { "op": "not", "arg": <ExprNode> }
  - if: { "op": "if", "cond": <ExprNode>, "then": <ExprNode>, "else": <ExprNode> }
  - regex: { "op": "regex", "value": <ExprNode>, "pattern": "<string>", "flags": "<string>" }
  - accumulate: { "op": "accumulate", "sourceFieldId": "gridId.fieldId", "action": "add"|"sub"|"mul", "startIndex": <number>, "endIndex": <number>, "increment": <number>, "initialValue": <number> }
  - sum: { "op": "sum", "sourceFieldId": "gridId.fieldId", "startIndex": <number>, "endIndex": <number>, "increment": <number>, "initialValue": <number> }
  - count: { "op": "count", "sourceFieldId": "gridId.fieldId" }

Any slot that says <ExprNode> can be another operator (recursive nesting).
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

export function deriveAvailableFields(currentTracker: unknown, targetGridId: string): AvailableField[] {
  if (!currentTracker || typeof currentTracker !== 'object' || Array.isArray(currentTracker)) return []
  const tracker = currentTracker as Record<string, unknown>
  const layoutNodes = Array.isArray(tracker.layoutNodes) ? tracker.layoutNodes : []
  const fields = Array.isArray(tracker.fields) ? tracker.fields : []
  const grids = Array.isArray(tracker.grids) ? tracker.grids : []
  const fieldsById = new Map(
    fields
      .filter((f): f is Record<string, unknown> => f && typeof f === 'object')
      .map((f) => [String(f.id ?? ''), f])
  )
  const gridNames = new Map(
    grids
      .filter((g): g is Record<string, unknown> => g && typeof g === 'object')
      .map((g) => [String(g.id ?? ''), String(g.name ?? g.id ?? '')])
  )

  const allNodes = layoutNodes
    .filter((n): n is Record<string, unknown> => n && typeof n === 'object')
    .sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : 0
      const bo = typeof b.order === 'number' ? b.order : 0
      return ao - bo
    })

  const seen = new Set<string>()
  const sameGrid: AvailableField[] = []
  const otherGrids: AvailableField[] = []

  for (const node of allNodes) {
    const nodeGridId = String(node.gridId ?? '').trim()
    const fieldId = String(node.fieldId ?? '').trim()
    if (!nodeGridId || !fieldId) continue
    const path = `${nodeGridId}.${fieldId}`
    if (seen.has(path)) continue
    seen.add(path)

    const field = fieldsById.get(fieldId)
    const rawLabel = field?.ui && typeof field.ui === 'object'
      ? String((field.ui as Record<string, unknown>).label ?? fieldId)
      : fieldId
    const dataType = field && typeof field.dataType === 'string' ? field.dataType : undefined
    const gridLabel = nodeGridId !== targetGridId ? ` [${gridNames.get(nodeGridId) ?? nodeGridId}]` : ''
    const entry: AvailableField = {
      fieldId: path,
      label: `${rawLabel}${gridLabel}`,
      dataType,
    }

    if (nodeGridId === targetGridId) {
      sameGrid.push(entry)
    } else {
      otherGrids.push(entry)
    }
  }

  return [...sameGrid, ...otherGrids]
}
