import 'server-only'

import type {
  Prisma,
  ReportDefinitionStatus,
  ReportRunTrigger,
  ReportRunStatus,
} from '@prisma/client'

import { prisma } from '@/lib/db'

import type { AnalysisStreamEvent } from './stream-events'

export type CreateAnalysisInput = {
  userId: string
  projectId: string
  moduleId?: string | null
  name: string
  trackerSchemaId: string
}

export async function createAnalysis(input: CreateAnalysisInput) {
  const tracker = await prisma.trackerSchema.findFirst({
    where: {
      id: input.trackerSchemaId,
      projectId: input.projectId,
      project: { userId: input.userId },
    },
    select: { id: true, moduleId: true },
  })
  if (!tracker) return null

  if (input.moduleId != null && tracker.moduleId !== input.moduleId) {
    return null
  }

  return prisma.$transaction(async (tx) => {
    const analysis = await tx.analysis.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        moduleId: input.moduleId ?? null,
        name: input.name.trim() || 'Untitled analysis',
        trackerSchemaId: input.trackerSchemaId,
      },
    })
    await tx.analysisDefinition.create({
      data: {
        analysisId: analysis.id,
        userPrompt: '',
        status: 'draft',
      },
    })
    return analysis
  })
}

export async function getAnalysisForUser(analysisId: string, userId: string) {
  return prisma.analysis.findFirst({
    where: { id: analysisId, userId },
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
  })
}

export async function updateAnalysisDefinitionPrompt(analysisId: string, userPrompt: string) {
  await prisma.analysisDefinition.update({
    where: { analysisId },
    data: { userPrompt },
  })
}

export async function saveAnalysisDefinitionArtifacts(params: {
  analysisId: string
  userPrompt: string
  outline: unknown
  queryPlan: unknown
  document: unknown
  schemaFingerprint: string
  status: ReportDefinitionStatus
  lastError?: string | null
}) {
  const readyAt = params.status === 'ready' ? new Date() : null
  await prisma.analysisDefinition.update({
    where: { analysisId: params.analysisId },
    data: {
      userPrompt: params.userPrompt,
      outline: params.outline as Prisma.InputJsonValue,
      queryPlan: params.queryPlan as Prisma.InputJsonValue,
      document: params.document as Prisma.InputJsonValue,
      schemaFingerprint: params.schemaFingerprint,
      status: params.status,
      lastError: params.lastError ?? null,
      readyAt,
      definitionVersion: { increment: 1 },
    },
  })
}

export async function markAnalysisDefinitionError(analysisId: string, message: string) {
  await prisma.analysisDefinition.update({
    where: { analysisId },
    data: {
      status: 'error',
      lastError: message,
    },
  })
}

export async function createAnalysisRun(analysisId: string, trigger: ReportRunTrigger) {
  return prisma.analysisRun.create({
    data: { analysisId, trigger, status: 'running' },
  })
}

export async function finishAnalysisRun(
  runId: string,
  status: Extract<ReportRunStatus, 'completed' | 'failed'>,
) {
  await prisma.analysisRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
    },
  })
}

export async function updateAnalysisNameForUser(
  analysisId: string,
  userId: string,
  name: string,
) {
  const existing = await prisma.analysis.findFirst({
    where: { id: analysisId, userId },
    select: { id: true },
  })
  if (!existing) return null
  const trimmed = name.trim() || 'Untitled analysis'
  return prisma.analysis.update({
    where: { id: analysisId },
    data: { name: trimmed },
  })
}

export async function deleteAnalysisForUser(analysisId: string, userId: string) {
  const existing = await prisma.analysis.findFirst({
    where: { id: analysisId, userId },
    select: { id: true },
  })
  if (!existing) return false
  await prisma.analysis.delete({ where: { id: analysisId } })
  return true
}

export async function appendAnalysisRunEvent(
  analysisRunId: string,
  seq: number,
  event: AnalysisStreamEvent,
) {
  const phase =
    'phase' in event && typeof (event as { phase?: string }).phase === 'string'
      ? (event as { phase: string }).phase
      : null
  await prisma.analysisRunEvent.create({
    data: {
      analysisRunId,
      seq,
      eventType: event.t,
      phase,
      payload: event as object,
    },
  })
}
