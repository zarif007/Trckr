import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  jsonOk,
  badRequest,
  notFound,
  parseJsonBody,
  readParams,
} from "@/lib/api/http";
import { findWorkflowForUser } from "@/lib/repositories/workflow-repository";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflows/execution/engine";
import { workflowSchemaZod } from "@/lib/workflows/schema";
import type {
  WorkflowSchema,
  WorkflowTriggerData,
} from "@/lib/workflows/types";

const triggerWorkflowBody = z.object({
  gridId: z.string(),
  rowId: z.string(),
  rowData: z.unknown(),
  changedFields: z.array(z.string()).optional(),
  previousRowData: z.unknown().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(context.params);
  if (!id) return badRequest("Missing workflow id");

  const workflow = await findWorkflowForUser(id, authResult.user.id);
  if (!workflow) return notFound("Workflow not found");

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: id },
    orderBy: { startedAt: "desc" },
    include: {
      steps: {
        orderBy: { startedAt: "asc" },
      },
    },
  });

  return jsonOk(
    runs.map((run) => ({
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      error: run.error,
      steps: run.steps.map((step) => ({
        id: step.id,
        nodeId: step.nodeId,
        status: step.status,
        inputData: step.inputData,
        outputData: step.outputData,
        startedAt: step.startedAt?.toISOString() ?? null,
        finishedAt: step.finishedAt?.toISOString() ?? null,
        error: step.error,
      })),
    })),
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await readParams(context.params);
  if (!id) return badRequest("Missing workflow id");

  const workflow = await findWorkflowForUser(id, authResult.user.id);
  if (!workflow) return notFound("Workflow not found");

  if (!workflow.enabled) {
    return badRequest("Workflow is disabled");
  }

  const body = await parseJsonBody(request, triggerWorkflowBody);
  if (!body.ok) return body.response;

  const triggerInput = {
    mode: "manual" as const,
    input: {
      gridId: body.data.gridId,
      rowId: body.data.rowId,
      rowData: body.data.rowData,
      changedFields: body.data.changedFields,
      previousRowData: body.data.previousRowData,
    },
  } as object;

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: id,
      status: "pending",
      trigger: triggerInput,
      startedAt: new Date(),
    },
  });

  // Execute the workflow with the trigger data.
  // The execution engine will update the run record as it processes each step.
  const parsedSchema = workflowSchemaZod.safeParse(workflow.schema);
  if (!parsedSchema.success) {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: "Invalid workflow schema",
        finishedAt: new Date(),
      },
    });
    return badRequest("Invalid workflow schema");
  }

  const schema: WorkflowSchema = parsedSchema.data;
  const triggerNode = schema.nodes.find((n) => n.type === "trigger");

  if (!triggerNode || triggerNode.type !== "trigger") {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: "No trigger node found",
        finishedAt: new Date(),
      },
    });
    return badRequest("Workflow has no trigger node");
  }

  const triggerData: WorkflowTriggerData = {
    event: triggerNode.config.event || "row_update",
    trackerSchemaId: triggerNode.config.trackerSchemaId,
    gridId: body.data.gridId,
    rowId: body.data.rowId,
    rowData: body.data.rowData as Record<string, unknown>,
    changedFields: body.data.changedFields,
    previousRowData: body.data.previousRowData as
      | Record<string, unknown>
      | undefined,
  };

  // Execute async (fire-and-forget to prevent request timeout)
  executeWorkflow(workflow.id, schema, triggerData).catch((err) => {
    console.error(`Workflow ${workflow.id} execution failed:`, err);
  });

  return jsonOk(
    {
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      startedAt: run.startedAt.toISOString(),
      finishedAt: null,
      error: null,
      triggerInput,
    },
    { status: 201 },
  );
}
