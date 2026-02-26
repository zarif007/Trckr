# Expr (expression rules)

Editing UI for field validation and calculation expressions. Supports a visual flow builder (React Flow), raw JSON, and AI-generated expressions.

## What it is

- **ExprRuleEditor**: Tabbed editor (Visual, JSON, AI prompt) for a single expression. Used for "Custom expression" validation rules and calculation expressions. Calls `/api/generate-expr` for AI generation.
- **ExprFlowBuilder**: Visual node-based editor: field nodes, const nodes, operator nodes (add, sub, eq, etc.), and a result node. Compiles the graph to an `ExprNode` and passes it to `onChange`.
- **expr-graph**: Compiles a React Flow graph to `ExprNode` (`compileExprFromGraph`) and serializes an `ExprNode` to nodes/edges (`exprToGraph`). Defines `ExprFlowNodeData`, handle IDs, and binary tree handling for add/mul.
- **expr-types**: `ExprFlowOperator`, `AvailableField`, `ExprFlowNodeType` for the flow builder and for consumers (e.g. generate-expr API).

## How it works

1. **FieldSettingsDialog** (Validations / Calculations tabs) renders **ExprRuleEditor** with the current expr, grid/field context, and available fields.
2. **ExprRuleEditor** shows three tabs: Visual (ExprFlowBuilder), JSON (textarea + blur-to-apply), AI (prompt + Generate). On change it normalizes the expr and calls `onChange(expr)`.
3. **ExprFlowBuilder** keeps React Flow nodes/edges in state, syncs from `expr` when it changes, and on "Apply visual expression" runs `compileExprFromGraph` and calls `onChange(result.expr)`.
4. **generate-expr** API may consume `AvailableField` from the edit-mode barrel for prompt context.

## Files

| File | Role |
|------|------|
| ExprRuleEditor.tsx | Tabbed wrapper: Visual / JSON / AI; uses ExprFlowBuilder and generate-expr API |
| ExprFlowBuilder.tsx | React Flow UI: palette, nodes, edges, compile on Apply |
| expr-graph.ts | compileExprFromGraph, exprToGraph, FLOW_CONSTANTS, ExprFlowNodeData |
| expr-types.ts | ExprFlowOperator, AvailableField, ExprFlowNodeType |
| index.ts | Barrel exports |

## Usage

- **ExprRuleEditor** is used by **FieldSettingsDialog** in the Validations and Calculations tabs.
- **AvailableField** (and optionally other expr-types) are exported from the edit-mode barrel for **app/api/generate-expr** and other consumers.
