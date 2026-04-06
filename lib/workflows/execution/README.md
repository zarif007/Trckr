# Workflow Execution Engine

DFS-based graph traversal for executing workflow nodes sequentially with branching support.

## Overview

The execution engine orchestrates workflow runs by traversing the workflow graph depth-first, executing each node's logic, recording steps in the database, and handling conditional branching.

## Execution Lifecycle

### 1. Initialization

```typescript
const run = await prisma.workflowRun.create({
  data: {
    workflowId,
    status: "pending",
    trigger: triggerData,
    startedAt: new Date(),
  },
});
```

Creates a `WorkflowRun` record to track this execution:
- Status starts as `"pending"`
- `trigger` contains the event data that initiated the workflow
- `startedAt` timestamp marks execution start

### 2. Trigger Validation

```typescript
executeTriggerNode(triggerNode, triggerData);
await createStep(run.id, triggerNode.id, "completed", triggerData);
```

Validates that the trigger event matches the trigger node configuration:
- Event type must match (`row_create`, `row_update`, `row_delete`, `field_change`)
- Tracker and grid IDs must match
- For `field_change` events, at least one watched field must have changed

If validation fails, marks run as `"failed"` and stops execution.

### 3. Graph Traversal (DFS)

```typescript
await dfsExecute(
  triggerNode.id,
  adjacencyList,
  nodes,
  context,
  run.id,
  new Set()
);
```

Executes nodes depth-first starting from the trigger:
- **Adjacency list**: Maps each node ID to its outgoing edges and target nodes
- **Context**: Carries execution state (trigger data, mapped data, node outputs)
- **Visited set**: Prevents redundant execution of already-visited nodes

#### Execution Order

1. Execute current node (if not yet visited)
2. Mark node as visited
3. Get node's outgoing edges
4. For each edge:
   - If source node is a condition, check branch type (`"true"` or `"false"`)
   - Follow edges that match the condition result
   - Recursively execute target nodes

### 4. Node Execution

```typescript
await executeNode(node, context, runId);
```

Each node type has a dedicated executor:
- **Condition**: Evaluates expression, stores result in `context._lastConditionResult`
- **Map Fields**: Resolves field mappings, stores in `context.mappedData`
- **Action**: Performs CRUD on tracker data, stores result in `context.nodeData[nodeId]`

After executing each node, creates a `WorkflowRunStep` record:
- `nodeId`: Which node executed
- `status`: `"completed"` or `"failed"`
- `inputData`: Node configuration or input data
- `outputData`: Result of node execution
- `error`: Error message if failed (optional)

### 5. Completion

```typescript
await markRunStatus(run.id, "completed");
return { success: true, runId: run.id };
```

Marks the `WorkflowRun` as `"completed"` (or `"failed"` if error occurred):
- Sets `finishedAt` timestamp
- Sets `error` message if applicable

## Execution Context

The context object carries state through the graph traversal:

```typescript
interface WorkflowExecutionContext {
  triggerData: WorkflowTriggerData;  // Original event data
  mappedData: Record<string, unknown>;  // Accumulated field mappings
  nodeData: Record<string, unknown>;  // Per-node execution results
  _lastConditionResult?: "true" | "false";  // Most recent condition outcome
}
```

### Context Usage

- **triggerData**: Available to all nodes for field references
- **mappedData**: Populated by Map Fields nodes, used by Action nodes
- **nodeData**: Stores outputs for debugging/auditing
- **_lastConditionResult**: Set by condition nodes, read by branching logic

## Branching Logic

Condition nodes split execution into two paths:

```typescript
if (node.type === "condition") {
  const branchResult = context._lastConditionResult ?? null;
  delete context._lastConditionResult;

  if (edge.branchType === branchResult) {
    await dfsExecute(/* follow this edge */);
  }
}
```

### Branch Types

- **`"true"` branch**: Followed when condition evaluates to truthy value
- **`"false"` branch**: Followed when condition evaluates to falsy value
- **No branch type**: Followed unconditionally (for non-condition nodes)

### Example

```
Trigger → Condition ("status == completed")
            ├─ true → Action ("Create invoice")
            └─ false → Action ("Send reminder")
```

Only one branch executes based on the condition result.

## Error Handling

### Node Execution Errors

When a node executor throws an error:

```typescript
catch (err) {
  await createStep(
    runId,
    node.id,
    "failed",
    undefined,
    undefined,
    err.message
  );
  throw err;  // Propagate to halt workflow
}
```

- Step is marked as `"failed"` with error message
- Error propagates up, marking the entire run as `"failed"`
- Execution stops (subsequent nodes don't execute)

### Trigger Validation Errors

```typescript
if (!triggerNode || triggerNode.type !== "trigger") {
  return { success: false, runId: "", error: "No trigger node found" };
}
```

Returns early without creating a run record.

### Critical Errors

```typescript
catch (err) {
  const message = err instanceof Error ? err.message : "Workflow execution failed";
  await markRunStatus(run.id, "failed", message);
  return { success: false, runId: run.id, error: message };
}
```

Catches any uncaught errors during traversal and marks run as failed.

## Performance Considerations

### Visited Set

```typescript
const visited = new Set<string>();

if (visited.has(nodeId)) return;
visited.add(nodeId);
```

Prevents infinite loops in case of workflow schema bugs (circular references).

### Async Execution

```typescript
// Fire-and-forget to prevent blocking API response
executeWorkflow(workflow.id, schema, triggerData).catch(err => {
  console.error(`Workflow ${workflow.id} execution failed:`, err);
});
```

Workflows execute asynchronously after the trigger API responds, preventing request timeouts.

### Database Batching

Step creation is sequential (not batched) to maintain execution order and simplify error handling. For high-volume workflows, consider batching step inserts.

## Debugging

### Run History

View all runs for a workflow:

```typescript
const runs = await prisma.workflowRun.findMany({
  where: { workflowId },
  include: { steps: true },
  orderBy: { startedAt: "desc" },
});
```

### Step Details

Each step records:
- **inputData**: Node configuration (e.g., condition expression, action type)
- **outputData**: Execution result (e.g., condition result, created row ID)
- **error**: Error message if step failed

Use these to trace execution and diagnose issues.

### Logging

All errors are logged to console:

```typescript
console.error(`Workflow ${workflow.id} execution failed:`, err);
```

Add custom logging for production monitoring.

## Related Documentation

- [Node Executors](./node-executors/README.md) - Individual node handler logic
- [Workflow System](../README.md) - High-level architecture
- [Trigger Handler](./trigger-handler.ts) - Event detection and dispatch
