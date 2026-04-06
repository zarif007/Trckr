# Workflow System

Automated actions triggered by tracker data changes.

## Overview

The workflow system enables users to create automated workflows that respond to changes in tracker data. Workflows are directed acyclic graphs (DAGs) composed of four node types that execute sequentially.

## Architecture

### Node Types

1. **Trigger** - Initiates workflow execution when specific tracker events occur
   - Events: `row_create`, `row_update`, `row_delete`, `field_change`
   - Watches a specific tracker's grid for changes
   - Can monitor specific fields for field_change events

2. **Condition** - Branches execution based on expression evaluation
   - Evaluates ExprNode expressions against trigger data
   - Returns `"true"` or `"false"` to determine which branch to follow
   - Supports logical operators (AND, OR, NOT) and comparisons (==, !=, >, <, >=, <=)

3. **Map Fields** - Transforms data from source grid to target grid format
   - Maps field values or expression results to target fields
   - Accumulates mapped data in `context.mappedData`
   - Supports field paths and complex expressions

4. **Action** - Performs CRUD operations on target tracker data
   - `create_row`: Creates new row with mapped data
   - `update_row`: Updates rows matching where clause with mapped data
   - `delete_row`: Deletes rows matching where clause

### Data Flow

```
User modifies tracker data
  ↓
API saves snapshot to database
  ↓
dispatchTrackerEventAfterSave() called
  ↓
Diffs old vs new snapshots
  ↓
Emits row-level events (create/update/delete)
  ↓
Finds matching workflows by event type
  ↓
executeWorkflow() for each match
  ↓
DFS graph traversal:
  - Validate trigger node
  - Execute nodes sequentially
  - Handle condition branching (true/false edges)
  - Accumulate mapped data
  - Perform actions on target trackers
  ↓
Record WorkflowRun and WorkflowRunStep in DB
```

### Integration Points

**Auto-trigger**: Workflows execute automatically when tracker data changes

- Hooked into `app/api/trackers/[id]/data/route.ts` POST handler (create/upsert)
- Hooked into `app/api/trackers/[id]/data/[dataId]/route.ts` PATCH handler (update)
- Calls `dispatchTrackerEventAfterSave()` after successful data save

**Manual trigger**: Workflows can be triggered manually via API

- Endpoint: `POST /api/workflows/[id]/runs`
- Requires trigger data (gridId, rowId, rowData)
- Creates WorkflowRun and calls `executeWorkflow()`

**Expression evaluation**: Reuses existing expression evaluator

- `lib/functions/evaluator.ts` - Evaluates ExprNode trees
- Same expression format as field rules and validations
- Supports field paths, operators, and nested logic

**Metadata loading**: Extracts tracker/grid structure for builder UI

- `lib/workflows/metadata.ts` - Parses tracker schemas
- Extracts grids, fields, and data types
- Used in workflow builder for dropdowns and field pickers

## Usage

### Creating a Workflow

```typescript
import type { WorkflowSchema } from "@/lib/workflows/types";

const schema: WorkflowSchema = {
  version: 1,
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      label: "When order is created",
      position: { x: 100, y: 100 },
      config: {
        trackerSchemaId: "orders_tracker",
        gridId: "orders_grid",
        event: "row_create",
      },
    },
    {
      id: "action-1",
      type: "action",
      label: "Create task",
      position: { x: 300, y: 100 },
      config: {
        actionType: "create_row",
        trackerSchemaId: "tasks_tracker",
        gridId: "tasks_grid",
        mapFieldsNodeId: "map-1",
      },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "trigger-1",
      target: "action-1",
    },
  ],
};

// Save via API
await fetch("/api/workflows", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectId: "proj-123",
    name: "Order to Task",
    enabled: true,
    schema,
  }),
});
```

### Field Path Format

Field references use the format `gridId.fieldId`:

- `orders_grid.customer_name`
- `tasks_grid.due_date`
- `inventory_grid.stock_level`

### Expression Format

Expressions use ExprNode trees compatible with `lib/functions/evaluator`:

```typescript
// Simple comparison: status == "completed"
{
  op: "==",
  operands: [
    { op: "field", path: "status" },
    { op: "literal", value: "completed" }
  ]
}

// Complex condition: status == "completed" AND amount > 100
{
  op: "AND",
  operands: [
    {
      op: "==",
      operands: [
        { op: "field", path: "status" },
        { op: "literal", value: "completed" }
      ]
    },
    {
      op: ">",
      operands: [
        { op: "field", path: "amount" },
        { op: "literal", value: 100 }
      ]
    }
  ]
}
```

### Manual Execution

```typescript
await fetch(`/api/workflows/${workflowId}/runs`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    gridId: "orders_grid",
    rowId: "row-123",
    rowData: { customer_name: "Acme Corp", amount: 500 },
  }),
});
```

## File Structure

```
lib/workflows/
├── README.md                     # This file
├── types.ts                      # TypeScript type definitions
├── schema.ts                     # Zod validation schemas
├── metadata.ts                   # Tracker/grid metadata extraction
├── validation.ts                 # Client-side workflow validation
├── execution/
│   ├── README.md                 # Execution engine documentation
│   ├── engine.ts                 # DFS orchestrator
│   ├── trigger-handler.ts        # Event dispatcher
│   └── node-executors/
│       ├── README.md             # Node executor documentation
│       ├── trigger.ts            # Trigger validation
│       ├── condition.ts          # Expression evaluation
│       ├── map-fields.ts         # Field mapping
│       └── action.ts             # CRUD operations
```

## API Reference

### `executeWorkflow(workflowId, schema, triggerData)`

Executes a workflow with the given trigger data.

**Parameters:**
- `workflowId: string` - ID of the workflow to execute
- `schema: WorkflowSchema` - Workflow definition
- `triggerData: WorkflowTriggerData` - Event data that triggered the workflow

**Returns:** `Promise<WorkflowExecutionResult>`
- `success: boolean`
- `runId: string`
- `error?: string`

**Side effects:**
- Creates `WorkflowRun` record in database
- Creates `WorkflowRunStep` records for each executed node
- May create/update/delete rows in target trackers

---

### `dispatchTrackerEventAfterSave(trackerId, newSnapshot, oldSnapshot, userId, isCreate)`

Diffs tracker snapshots and dispatches workflows for matching events.

**Parameters:**
- `trackerId: string` - ID of the tracker that changed
- `newSnapshot: GridDataSnapshot` - New data state
- `oldSnapshot: GridDataSnapshot | null` - Previous data state
- `userId: string` - ID of the user who made the change
- `isCreate: boolean` - Whether this is a create operation

**Returns:** `Promise<void>`

**Logic:**
1. Finds enabled workflows with triggers watching this tracker
2. Compares old vs new snapshots to detect row-level changes
3. For each change, calls `executeWorkflow()` with appropriate trigger data
4. Handles row_create, row_update, row_delete, and field_change events

---

### `validateWorkflowSchema(schema)`

Validates a workflow schema for common errors.

**Parameters:**
- `schema: WorkflowSchema` - Workflow definition to validate

**Returns:** `ValidationError[]` - Array of validation errors (empty if valid)

**Validation rules:**
- Must have exactly one trigger node
- All nodes must be fully configured
- Action nodes must have where clause for update/delete
- Condition nodes must have a condition expression
- Map fields nodes must have at least one mapping
- All edges must connect valid nodes
- No disconnected nodes (except trigger)

---

### `extractTrackersFromProject(project)`

Extracts tracker/grid metadata from project data.

**Parameters:**
- `project: { trackerSchemas: [], modules: [] }` - Project with trackers

**Returns:** `TrackerMetadata[]` - Array of tracker metadata with grids and fields

**Used by:** Workflow builder UI to populate dropdowns and field pickers

---

### `flattenTrackerFields(trackers)`

Flattens all fields from all grids into a single array.

**Parameters:**
- `trackers: TrackerMetadata[]` - Array of tracker metadata

**Returns:** `FieldMetadata[]` - Array of fields with prefixed IDs (`gridId.fieldId`)

**Used by:** Expression builder field picker

## Testing

Run workflow tests:

```bash
vitest run lib/workflows/**/*.test.ts
```

End-to-end test scenarios are documented in the main implementation plan.

## Future Enhancements

- **Parallel execution**: Execute independent branches concurrently
- **Retry/rollback**: Automatic retry on failure with rollback support
- **Webhook triggers**: Trigger workflows from external HTTP requests
- **Scheduled triggers**: Execute workflows on a schedule (cron-like)
- **Workflow templates**: Pre-built workflow patterns for common use cases
- **Visual debugging**: Step-through debugger for workflow execution
- **Workflow versioning**: Track changes to workflow schemas over time

## Related Documentation

- [Execution Engine](./execution/README.md) - DFS traversal and run tracking
- [Node Executors](./execution/node-executors/README.md) - Individual node handlers
- [Expression Evaluator](../functions/README.md) - ExprNode evaluation
- [Tracker System](../tracker-data/README.md) - Grid data format and snapshots
