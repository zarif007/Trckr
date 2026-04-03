import { ConversationMode, Role, ToolCallStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ToolCallPurpose } from "@/lib/agent/tool-calls";

export type ToolCallInsert = {
  purpose: ToolCallPurpose;
  fieldPath: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
  result?: unknown;
};

export async function findLatestConversationForTracker(
  trackerId: string,
  userId: string,
  includeMessages: boolean,
  mode?: ConversationMode,
) {
  return prisma.conversation.findFirst({
    where: {
      trackerSchemaId: trackerId,
      ...(mode != null && { mode }),
      trackerSchema: {
        project: { userId },
      },
    },
    orderBy: { createdAt: "desc" },
    include: includeMessages
      ? { messages: { orderBy: { createdAt: "asc" } } }
      : undefined,
  });
}

export async function findLatestConversationForTrackerWithMessages(
  trackerId: string,
  userId: string,
  mode?: ConversationMode,
) {
  return prisma.conversation.findFirst({
    where: {
      trackerSchemaId: trackerId,
      ...(mode != null && { mode }),
      trackerSchema: {
        project: { userId },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listConversationsForTracker(
  trackerId: string,
  userId: string,
  mode?: ConversationMode,
) {
  return prisma.conversation.findMany({
    where: {
      trackerSchemaId: trackerId,
      ...(mode != null && { mode }),
      trackerSchema: {
        project: { userId },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      mode: true,
      createdAt: true,
      messages: {
        where: { role: Role.USER },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });
}

export async function createConversation(
  trackerId: string,
  userId: string,
  mode: ConversationMode = ConversationMode.BUILDER,
  title?: string | null,
) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId },
    },
    select: { id: true },
  });
  if (!tracker) return null;

  const count = await prisma.conversation.count({
    where: {
      trackerSchemaId: trackerId,
      mode,
      trackerSchema: {
        project: { userId },
      },
    },
  });
  const resolvedTitle = title ?? `Chat ${count + 1}`;

  return prisma.conversation.create({
    data: {
      trackerSchemaId: trackerId,
      mode,
      title: resolvedTitle,
    },
  });
}

export async function ensureConversationForTracker(
  trackerId: string,
  userId: string,
  mode: ConversationMode = ConversationMode.BUILDER,
) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: trackerId,
      project: { userId },
    },
    select: { id: true },
  });
  if (!tracker) return null;

  const latest = await findLatestConversationForTracker(
    trackerId,
    userId,
    false,
    mode,
  );
  if (latest) return latest;

  return prisma.conversation.create({
    data: { trackerSchemaId: trackerId, mode },
  });
}

export async function userOwnsConversation(
  conversationId: string,
  userId: string,
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      trackerSchema: {
        project: { userId },
      },
    },
    select: { id: true },
  });
  return !!conversation;
}

export async function findConversationWithMessages(
  conversationId: string,
  userId: string,
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      trackerSchema: {
        project: { userId },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { toolCalls: true },
      },
    },
  });
}

type ManagerData = {
  thinking?: unknown;
  [key: string]: unknown;
};

function sanitizeManagerData(input: unknown): object | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return undefined;
  const sanitized = { ...(input as ManagerData) };
  if ("thinking" in sanitized) delete sanitized.thinking;
  return sanitized;
}

const toolCallStatusToDb = (s: ToolCallInsert["status"]): ToolCallStatus => {
  switch (s) {
    case "pending":
      return ToolCallStatus.pending;
    case "running":
      return ToolCallStatus.running;
    case "done":
      return ToolCallStatus.done;
    case "error":
      return ToolCallStatus.error;
    default:
      return ToolCallStatus.pending;
  }
};

export async function appendConversationMessage(params: {
  conversationId: string;
  userId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  trackerSchemaSnapshot?: object;
  managerData?: unknown;
  toolCalls?: ToolCallInsert[];
}) {
  const canAccess = await userOwnsConversation(
    params.conversationId,
    params.userId,
  );
  if (!canAccess) return null;

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId: params.conversationId,
        role: params.role === "ASSISTANT" ? Role.ASSISTANT : Role.USER,
        content: params.content,
        trackerSchemaSnapshot: params.trackerSchemaSnapshot,
        managerData: sanitizeManagerData(params.managerData),
      },
    });

    if (params.toolCalls?.length) {
      await tx.toolCall.createMany({
        data: params.toolCalls.map((tc) => ({
          messageId: msg.id,
          purpose: tc.purpose,
          fieldPath: tc.fieldPath,
          description: tc.description,
          status: toolCallStatusToDb(tc.status),
          error: tc.error ?? null,
          ...(tc.result !== undefined &&
            tc.result !== null && { result: tc.result as object }),
        })),
      });
    }

    return msg;
  });

  return message;
}
