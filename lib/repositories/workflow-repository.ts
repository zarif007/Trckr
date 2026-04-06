import { prisma } from "@/lib/db";
import type { WorkflowSchema } from "@/lib/workflows/types";

export interface CreateWorkflowInput {
  projectId: string;
  moduleId?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  schema: WorkflowSchema;
  userId: string;
}

export interface UpdateWorkflowInput {
  id: string;
  userId: string;
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    schema?: WorkflowSchema;
  };
}

export interface WorkflowCreateResult {
  ok: true;
  id: string;
}

export interface WorkflowError {
  ok: false;
  error: string;
}

export async function createWorkflow(
  input: CreateWorkflowInput,
): Promise<WorkflowCreateResult | WorkflowError> {
  try {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId: input.userId },
    });
    if (!project) {
      return { ok: false, error: "Project not found" };
    }

    const workflow = await prisma.workflow.create({
      data: {
        projectId: input.projectId,
        moduleId: input.moduleId ?? null,
        name: input.name,
        description: input.description ?? null,
        enabled: input.enabled ?? true,
        schema: input.schema as object,
      },
    });

    return { ok: true, id: workflow.id };
  } catch {
    return { ok: false, error: "Failed to create workflow" };
  }
}

export async function findWorkflowForUser(
  workflowId: string,
  userId: string,
) {
  return prisma.workflow.findFirst({
    where: {
      id: workflowId,
      project: { userId },
    },
    include: {
      module: { select: { id: true, name: true } },
    },
  });
}

export async function listWorkflowsForProject(
  projectId: string,
  userId: string,
) {
  return prisma.workflow.findMany({
    where: {
      projectId,
      project: { userId },
    },
    include: {
      module: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateWorkflow(
  input: UpdateWorkflowInput,
): Promise<boolean> {
  const owningProject = await prisma.project.findFirst({
    where: { id: input.id, userId: input.userId },
  });

  if (!owningProject) {
    return false;
  }

  const { name, ...rest } = input.data;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.enabled !== undefined) updateData.enabled = rest.enabled;
  if (rest.schema !== undefined) updateData.schema = rest.schema;
  if (Object.keys(updateData).length === 0) return false;

  await prisma.workflow.update({
    where: { id: input.id },
    data: updateData,
  });

  return true;
}

export async function deleteWorkflowForUser(
  workflowId: string,
  userId: string,
): Promise<boolean> {
  const workflow = await findWorkflowForUser(workflowId, userId);
  if (!workflow) return false;

  await prisma.workflow.delete({ where: { id: workflowId } });
  return true;
}
