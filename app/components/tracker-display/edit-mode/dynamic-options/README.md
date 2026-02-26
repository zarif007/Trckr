# Dynamic options

UI for configuring dynamic option sources: graph-based pipeline (sources, transforms, AI) that produces option rows for choice/select fields.

## What it is

- **DynamicOptionsBuilder**: Tabbed UI (Visual, JSON, AI, Connectors) for editing a field’s dynamic options. Manages function list, template creation, flow validation, and preview via `/api/dynamic-options/resolve`. Used inside FieldSettingsDialog.
- **DynamicFunctionFlowBuilder**: React Flow canvas for editing a single graph function: add nodes from palette (grid rows, current context, HTTP, filter, map, sort, limit, LLM extractor, etc.), connect edges, sync back to graph def. Validates and reports errors.
- **dynamic-function-graph**: Palette (`DYNAMIC_NODE_PALETTE`), `nodeKindLabel`, `buildDefaultGraph` (templates: grid_values, current_row, external_api, ai_from_api), `ensureGraphFunction` (legacy → graph_v1), `createTemplateGraphFunction`, `summarizeGraph`. Uses `TrackerDisplayProps` for fallback grid/field IDs.

## How it works

1. **FieldSettingsDialog** (Dynamic options tab) renders **DynamicOptionsBuilder** with the field’s `dynamicOptions` draft, selected function id, args, cache TTL, and validation/preview callbacks.
2. **DynamicOptionsBuilder** shows a function selector, Visual/JSON/AI/Connectors tabs. Visual tab uses **DynamicFunctionFlowBuilder**; templates use **createTemplateGraphFunction** and **buildDefaultGraph**; preview calls **resolveDynamicOptions** with **remoteResolver** → `/api/dynamic-options/resolve`.
3. **DynamicFunctionFlowBuilder** converts graph def ↔ React Flow nodes/edges, debounces changes back to `onChange(graph)`, and calls **compileDynamicOptionFunctionGraph** (from `@/lib/dynamic-options`) for validation.

## Files

| File | Role |
|------|------|
| DynamicOptionsBuilder.tsx | Tabbed builder: function list, templates, flow, JSON, AI, connectors, preview |
| DynamicFunctionFlowBuilder.tsx | React Flow editor for one graph function; palette, nodes, validation |
| dynamic-function-graph.ts | Palette, labels, buildDefaultGraph, ensureGraphFunction, createTemplateGraphFunction, summarizeGraph |
| index.ts | Barrel exports |

## Usage

- **DynamicOptionsBuilder** is used by **FieldSettingsDialog** in the Dynamic options tab.
- **dynamic-function-graph** helpers are used by DynamicOptionsBuilder and DynamicFunctionFlowBuilder; types and compile are from `@/lib/dynamic-options`.
