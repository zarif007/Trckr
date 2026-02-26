interface PromptInputs {
  prompt: string
  functionId: string
  functionName: string
  currentTracker: unknown
  sampleResponse?: unknown
}

function summarizeTracker(currentTracker: unknown): string {
  if (!currentTracker || typeof currentTracker !== 'object' || Array.isArray(currentTracker)) {
    return 'No tracker context provided.'
  }
  const tracker = currentTracker as Record<string, unknown>
  const grids = Array.isArray(tracker.grids) ? tracker.grids : []
  const fields = Array.isArray(tracker.fields) ? tracker.fields : []
  const dynamicOptions =
    tracker.dynamicOptions && typeof tracker.dynamicOptions === 'object'
      ? (tracker.dynamicOptions as Record<string, unknown>)
      : {}
  const connectors =
    dynamicOptions.connectors && typeof dynamicOptions.connectors === 'object'
      ? (dynamicOptions.connectors as Record<string, unknown>)
      : {}

  const gridLines = grids
    .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
    .map((g) => `- ${String(g.id ?? '')} (${String(g.name ?? g.id ?? '')})`)

  const fieldLines = fields
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => `- ${String(f.id ?? '')} [${String(f.dataType ?? 'string')}]`)

  const connectorLines = Object.values(connectors)
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => `- ${String(c.id ?? '')} (${String(c.name ?? c.id ?? '')})`)

  return [
    'Grids:',
    gridLines.length ? gridLines.join('\n') : '- none',
    '\nFields:',
    fieldLines.length ? fieldLines.join('\n') : '- none',
    '\nConnectors:',
    connectorLines.length ? connectorLines.join('\n') : '- none',
  ].join('\n')
}

export function buildSystemPrompt(): string {
  return `
You generate a DynamicOptionFunctionDef JSON object.

Rules:
- Output ONLY JSON matching: { "function": <DynamicOptionFunctionDef> }
- Keep the provided id and name exactly as given.
- Default to engine "graph_v1" with graph nodes/edges.
- Never output JavaScript.
- Include control.start and output.options nodes and valid entryNodeId/returnNodeId.
- Prefer source.grid_rows or source.layout_fields when possible; use source.http_get only when needed.
- Use only allowed kinds: source.*, transform.*, ai.extract_options, output.options.
- Always provide output.options mapping with label and value selectors.
- Keep version=1 and enabled=true unless user explicitly asks otherwise.
- If uncertain, generate a minimal valid graph template that can be edited safely.
`.trim()
}

export function buildUserPrompt(inputs: PromptInputs): string {
  const trackerSummary = summarizeTracker(inputs.currentTracker)
  const sample =
    inputs.sampleResponse == null
      ? 'No sample response provided.'
      : JSON.stringify(inputs.sampleResponse, null, 2)

  return `
Function id: ${inputs.functionId}
Function name: ${inputs.functionName}

Tracker context:
${trackerSummary}

User request:
${inputs.prompt}

Optional API sample response:
${sample}
`.trim()
}
