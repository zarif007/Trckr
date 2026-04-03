import "server-only";

import type {
  Prisma,
  ReportDefinitionStatus,
  ReportRunTrigger,
  ReportRunStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db";

import type { ReportStreamEvent } from "./stream-events";

export type CreateReportInput = {
  userId: string;
  projectId: string;
  moduleId?: string | null;
  name: string;
  trackerSchemaId: string;
};

export async function createReport(input: CreateReportInput) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: input.trackerSchemaId,
      projectId: input.projectId,
      project: { userId: input.userId },
    },
    select: { id: true, moduleId: true },
  });
  if (!tracker) return null;

  if (input.moduleId != null && tracker.moduleId !== input.moduleId) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        moduleId: input.moduleId ?? null,
        name: input.name.trim() || "Untitled report",
        trackerSchemaId: input.trackerSchemaId,
      },
    });
    await tx.reportDefinition.create({
      data: {
        reportId: report.id,
        userPrompt: "",
        status: "draft",
      },
    });
    return report;
  });
}

export async function getReportForUser(reportId: string, userId: string) {
  return prisma.report.findFirst({
    where: { id: reportId, userId },
    include: {
      definition: true,
      trackerSchema: {
        select: {
          id: true,
          name: true,
          schema: true,
          projectId: true,
          instance: true,
          versionControl: true,
        },
      },
      project: { select: { id: true, name: true } },
      module: { select: { id: true, name: true } },
    },
  });
}

export async function updateDefinitionPrompt(
  reportId: string,
  userPrompt: string,
) {
  await prisma.reportDefinition.update({
    where: { reportId },
    data: { userPrompt },
  });
}

export async function saveDefinitionArtifacts(params: {
  reportId: string;
  userPrompt: string;
  intent: unknown;
  queryPlan: unknown;
  calcPlan: unknown;
  formatterPlan: unknown;
  schemaFingerprint: string;
  status: ReportDefinitionStatus;
  lastError?: string | null;
}) {
  const readyAt = params.status === "ready" ? new Date() : null;
  await prisma.reportDefinition.update({
    where: { reportId: params.reportId },
    data: {
      userPrompt: params.userPrompt,
      intent: params.intent as Prisma.InputJsonValue,
      queryPlan: params.queryPlan as Prisma.InputJsonValue,
      calcPlan: params.calcPlan as Prisma.InputJsonValue,
      formatterPlan: params.formatterPlan as Prisma.InputJsonValue,
      schemaFingerprint: params.schemaFingerprint,
      status: params.status,
      lastError: params.lastError ?? null,
      readyAt,
      definitionVersion: { increment: 1 },
    },
  });
}

export async function markDefinitionError(reportId: string, message: string) {
  await prisma.reportDefinition.update({
    where: { reportId },
    data: {
      status: "error",
      lastError: message,
    },
  });
}

export async function createReportRun(
  reportId: string,
  trigger: ReportRunTrigger,
) {
  return prisma.reportRun.create({
    data: { reportId, trigger, status: "running" },
  });
}

export async function finishReportRun(
  runId: string,
  status: Extract<ReportRunStatus, "completed" | "failed">,
) {
  await prisma.reportRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
    },
  });
}

export async function updateReportNameForUser(
  reportId: string,
  userId: string,
  name: string,
) {
  const existing = await prisma.report.findFirst({
    where: { id: reportId, userId },
    select: { id: true },
  });
  if (!existing) return null;
  const trimmed = name.trim() || "Untitled report";
  return prisma.report.update({
    where: { id: reportId },
    data: { name: trimmed },
  });
}

export async function deleteReportForUser(reportId: string, userId: string) {
  const existing = await prisma.report.findFirst({
    where: { id: reportId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.report.delete({ where: { id: reportId } });
  return true;
}

export async function appendReportRunEvent(
  reportRunId: string,
  seq: number,
  event: ReportStreamEvent,
) {
  const phase =
    "phase" in event && typeof (event as { phase?: string }).phase === "string"
      ? (event as { phase: string }).phase
      : null;
  await prisma.reportRunEvent.create({
    data: {
      reportRunId,
      seq,
      eventType: event.t,
      phase,
      payload: event as object,
    },
  });
}
