# Node Executors

Individual handler functions for each workflow node type.

## Overview

Each node type has a dedicated executor function that implements its specific logic. Executors are called by the execution engine during graph traversal and receive the node configuration and execution context.

## Trigger Executor

**File**: `trigger.ts`

**Function**: `executeTriggerNode(node, triggerData)`

### Purpose

Validates that the trigger event matches the trigger node configuration. Does not perform any actions—simply validates or throws an error.

### Logic

```typescript
export function executeTriggerNode(
  node: TriggerNode,
  triggerData: WorkflowTriggerData
): void {
  // Event type must match
  if (node.config.event !== triggerData.event) {
    throw new Error(
      `Trigger event mismatch: expected ${node.config.event}, got ${triggerData.event}`
    );
  }

  // Tracker and grid must match
  if (
    node.config.trackerSchemaId !== triggerData.trackerSchemaId ||
    node.config.gridId !== triggerData.gridId
  ) {
    throw new Error("Trigger tracker/grid mismatch");
  }

  // For field_change events, check if watched fields changed
  if (node.config.event === "field_change") {
    const watchFields = node.config.watchFields || [];
    const changedFields = triggerData.changedFields || [];

    const hasMatch = watchFields.some(f => changedFields.includes(f));
    if (!hasMatch) {
      throw new Error("No watched fields changed");
    }
  }
}
```

### Errors

- `"Trigger event mismatch"`: Event type doesn't match node config
- `"Trigger tracker/grid mismatch"`: Tracker or grid ID doesn't match
- `"No watched fields changed"`: For field_change events, none of the watched fields changed

### Usage

Called by the execution engine immediately after starting a workflow run. If validation fails, the entire run is marked as failed and execution stops.

---

## Condition Executor

**File**: `condition.ts`

**Function**: `executeConditionNode(node, context) → "true" | "false"`

### Purpose

Evaluates an expression against the execution context and returns the branch to follow.

### Logic

```typescript
export async function executeConditionNode(
  node: ConditionNode,
  context: WorkflowExecutionContext
): Promise<"true" | "false"> {
  const expr = node.config.condition;

  // Prepare evaluation context with trigger row data
  const evalContext = {
    ...context.triggerData.rowData,
    ...context.mappedData,
  };

  // Evaluate expression using lib/functions/evaluator
  const result = evaluateExpression(expr, evalContext);

  // Convert to boolean and return branch
  return result ? "true" : "false";
}
```

### Expression Evaluation

Uses `lib/functions/evaluator.ts` to evaluate ExprNode trees. The evaluator supports:
- **Logical operators**: AND, OR, NOT
- **Comparison operators**: ==, !=, >, <, >=, <=
- **Arithmetic operators**: +, -, *, /
- **Field references**: `{ op: "field", path: "fieldId" }`
- **Literals**: `{ op: "literal", value: any }`

### Context Data

The evaluator has access to:
- **Trigger row data**: `context.triggerData.rowData`
- **Mapped data**: `context.mappedData` (from Map Fields nodes)

### Example

```typescript
// Expression: status == "completed"
{
  op: "==",
  operands: [
    { op: "field", path: "status" },
    { op: "literal", value: "completed" }
  ]
}

// If rowData.status === "completed", returns "true"
// Otherwise returns "false"
```

### Return Value

- `"true"`: Follow edges with `branchType: "true"`
- `"false"`: Follow edges with `branchType: "false"`

---

## Map Fields Executor

**File**: `map-fields.ts`

**Function**: `executeMapFieldsNode(node, context) → Record<string, unknown>`

### Purpose

Resolves field mappings from source data to target format. Accumulates mapped values in `context.mappedData`.

### Logic

```typescript
export async function executeMapFieldsNode(
  node: MapFieldsNode,
  context: WorkflowExecutionContext
): Promise<Record<string, unknown>> {
  const mappings = node.config.mappings || [];

  for (const mapping of mappings) {
    const sourceValue = resolveSource(mapping.source, context);
    const targetKey = `${mapping.targetTrackerSchemaId}.${mapping.targetGridId}.${mapping.targetFieldId}`;

    context.mappedData[targetKey] = sourceValue;
  }

  return context.mappedData;
}
```

### Source Resolution

The `source` can be:
1. **Field path**: `{ type: "field", fieldId: "gridId.fieldId" }`
   - Resolves to `context.triggerData.rowData[fieldId]`
2. **Expression**: `{ type: "expression", expr: ExprNode }`
   - Evaluates expression against context data

### Target Format

Mapped data is stored with a composite key:
```
trackerSchemaId.gridId.fieldId → value
```

Example:
```typescript
{
  "tasks_tracker.tasks_grid.title": "Follow up with customer",
  "tasks_tracker.tasks_grid.due_date": "2024-12-31"
}
```

### Usage by Action Nodes

Action nodes reference the Map Fields node ID:
```typescript
{
  type: "action",
  config: {
    actionType: "create_row",
    mapFieldsNodeId: "map-1"
  }
}
```

The action executor reads `context.mappedData` to get field values.

---

## Action Executor

**File**: `action.ts`

**Function**: `executeActionNode(node, context) → Record<string, unknown>`

### Purpose

Performs CRUD operations on tracker data (create, update, or delete rows).

### Action Types

#### 1. create_row

Creates a new row in the target grid with mapped data.

```typescript
const newRow = {
  id: generateId(),
  ...getMappedFieldsForGrid(context.mappedData, node.config.gridId),
};

await prisma.trackerData.update({
  where: { trackerSchemaId: node.config.trackerSchemaId },
  data: {
    data: {
      ...existingData,
      [node.config.gridId]: [...existingRows, newRow],
    },
  },
});

return { rowId: newRow.id, created: true };
```

#### 2. update_row

Updates rows matching the where clause with mapped data.

```typescript
const whereClause = node.config.whereClause;
const matchingRows = existingRows.filter(row =>
  evaluateExpression(whereClause, row)
);

for (const row of matchingRows) {
  Object.assign(row, getMappedFieldsForGrid(context.mappedData, node.config.gridId));
}

await prisma.trackerData.update({
  where: { trackerSchemaId: node.config.trackerSchemaId },
  data: { data: updatedSnapshot },
});

return { updatedCount: matchingRows.length };
```

#### 3. delete_row

Deletes rows matching the where clause.

```typescript
const whereClause = node.config.whereClause;
const remainingRows = existingRows.filter(row =>
  !evaluateExpression(whereClause, row)
);

await prisma.trackerData.update({
  where: { trackerSchemaId: node.config.trackerSchemaId },
  data: {
    data: {
      ...existingData,
      [node.config.gridId]: remainingRows,
    },
  },
});

return { deletedCount: existingRows.length - remainingRows.length };
```

### Where Clause Evaluation

Where clauses are ExprNode expressions evaluated against each row:
```typescript
{
  op: "==",
  operands: [
    { op: "field", path: "status" },
    { op: "literal", value: "archived" }
  ]
}
```

Rows where the expression evaluates to `true` are updated/deleted.

### Field Mapping Helper

```typescript
function getMappedFieldsForGrid(
  mappedData: Record<string, unknown>,
  gridId: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(mappedData)) {
    const [_, mappedGridId, fieldId] = key.split(".");
    if (mappedGridId === gridId) {
      result[fieldId] = value;
    }
  }

  return result;
}
```

Extracts mapped values for a specific grid from the composite keys.

### Return Values

- **create_row**: `{ rowId: string, created: true }`
- **update_row**: `{ updatedCount: number }`
- **delete_row**: `{ deletedCount: number }`

These values are stored in `context.nodeData[nodeId]` for debugging.

---

## Error Handling

All executors may throw errors:

```typescript
try {
  await executeActionNode(node, context);
} catch (err) {
  // Error is caught by execution engine
  // Step marked as failed with error message
  // Workflow execution stops
}
```

Common errors:
- **Trigger**: Event/tracker mismatch
- **Condition**: Invalid expression, missing fields
- **Map Fields**: Source field not found, expression error
- **Action**: Target tracker not found, permission denied, where clause error

---

## Adding New Node Types

To add a new node type:

1. **Define types** in `lib/workflows/types.ts`:
   ```typescript
   export interface CustomNode extends BaseNode {
     type: "custom";
     config: { /* custom config */ };
   }
   ```

2. **Create executor** in `node-executors/custom.ts`:
   ```typescript
   export async function executeCustomNode(
     node: CustomNode,
     context: WorkflowExecutionContext
   ): Promise<unknown> {
     // Implementation
   }
   ```

3. **Register in engine** (`execution/engine.ts`):
   ```typescript
   switch (node.type) {
     case "custom":
       await executeCustomNode(node, context);
       break;
   }
   ```

4. **Add UI components**:
   - Node component in `app/components/workflow-builder/nodes/`
   - Config panel in `app/components/workflow-builder/config-panels/`

---

## Testing

Unit tests for executors should cover:
- **Happy path**: Valid configuration and data
- **Error cases**: Invalid config, missing data, permission errors
- **Edge cases**: Empty arrays, null values, boundary conditions

Example:
```typescript
describe("executeConditionNode", () => {
  it("returns 'true' when condition matches", () => {
    const node = {
      type: "condition",
      config: {
        condition: {
          op: "==",
          operands: [
            { op: "field", path: "status" },
            { op: "literal", value: "active" }
          ]
        }
      }
    };

    const context = {
      triggerData: {
        rowData: { status: "active" }
      }
    };

    const result = await executeConditionNode(node, context);
    expect(result).toBe("true");
  });
});
```

---

## Related Documentation

- [Execution Engine](../README.md) - DFS traversal and orchestration
- [Workflow System](../../README.md) - High-level architecture
- [Expression Evaluator](../../../functions/README.md) - ExprNode evaluation
