import type { LanguageModelUsage } from "ai";

import { prisma } from "@/lib/db";

export type LlmUsageAttribution = {
  projectId: string | null;
  trackerSchemaId: string | null;
};

export async function resolveLlmUsageAttribution(
  userId: string,
  input: { trackerSchemaId?: string | null; projectId?: string | null },
): Promise<
  | { ok: true; value: LlmUsageAttribution }
  | { ok: false; error: string; status: number }
> {
  const tsId = input.trackerSchemaId?.trim() || null;
  const pId = input.projectId?.trim() || null;

  if (tsId) {
    const row = await prisma.trackerSchema.findFirst({
      where: { id: tsId, project: { userId } },
      select: { id: true, projectId: true },
    });
    if (!row) {
      return {
        ok: false,
        error: "Tracker not found or access denied.",
        status: 403,
      };
    }
    if (pId && row.projectId !== pId) {
      return {
        ok: false,
        error: "Project does not match tracker.",
        status: 400,
      };
    }
    return {
      ok: true,
      value: { projectId: row.projectId, trackerSchemaId: row.id },
    };
  }

  if (pId) {
    const project = await prisma.project.findFirst({
      where: { id: pId, userId },
      select: { id: true },
    });
    if (!project) {
      return {
        ok: false,
        error: "Project not found or access denied.",
        status: 403,
      };
    }
    return {
      ok: true,
      value: { projectId: project.id, trackerSchemaId: null },
    };
  }

  return { ok: true, value: { projectId: null, trackerSchemaId: null } };
}

export function tokenCountsFromUsage(usage: LanguageModelUsage): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null {
  const prompt = usage.inputTokens;
  const completion = usage.outputTokens;
  const total = usage.totalTokens;
  if (prompt === undefined && completion === undefined && total === undefined) {
    return null;
  }
  const p = prompt ?? 0;
  const c = completion ?? 0;
  const t = total ?? p + c;
  return { promptTokens: p, completionTokens: c, totalTokens: t };
}

export async function recordLlmUsage(params: {
  userId: string;
  source: string;
  usage: LanguageModelUsage;
  projectId?: string | null;
  trackerSchemaId?: string | null;
  analysisId?: string | null;
}): Promise<void> {
  const counts = tokenCountsFromUsage(params.usage);
  if (!counts) return;

  await prisma.llmTokenUsage.create({
    data: {
      userId: params.userId,
      source: params.source,
      promptTokens: counts.promptTokens,
      completionTokens: counts.completionTokens,
      totalTokens: counts.totalTokens,
      projectId: params.projectId ?? null,
      trackerSchemaId: params.trackerSchemaId ?? null,
      analysisId: params.analysisId ?? null,
    },
  });
}

export function scheduleRecordLlmUsage(
  params: Parameters<typeof recordLlmUsage>[0],
): void {
  void recordLlmUsage(params).catch((err) => {
    console.error("[llm-usage] Failed to record usage", err);
  });
}

export type LlmUsageDashboardRow = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

export type LlmUsageByProjectRow = LlmUsageDashboardRow & {
  projectId: string;
  name: string;
};

export type LlmUsageByTrackerRow = LlmUsageDashboardRow & {
  trackerSchemaId: string;
  name: string;
  projectId: string | null;
};

export type LlmUsageAnalysisDetailRow = LlmUsageDashboardRow & {
  analysisId: string | null;
  analysisName: string;
  dataTrackerName: string;
};

export type LlmUsageByTrackerBreakdownRow = LlmUsageByTrackerRow & {
  otherOnTracker: LlmUsageDashboardRow;
  analysisDetails: LlmUsageAnalysisDetailRow[];
};

export type LlmUsageDashboard = {
  totals: LlmUsageDashboardRow;
  byProject: LlmUsageByProjectRow[];
  byTracker: LlmUsageByTrackerBreakdownRow[];
};

function sumRow(s: {
  _sum: {
    totalTokens: number | null;
    promptTokens: number | null;
    completionTokens: number | null;
  };
}): LlmUsageDashboardRow {
  return {
    totalTokens: s._sum.totalTokens ?? 0,
    promptTokens: s._sum.promptTokens ?? 0,
    completionTokens: s._sum.completionTokens ?? 0,
  };
}

export async function getLlmUsageDashboard(
  userId: string,
): Promise<LlmUsageDashboard> {
  const overall = await prisma.llmTokenUsage.aggregate({
    where: { userId },
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
  });

  const projectGroups = await prisma.llmTokenUsage.groupBy({
    by: ["projectId"],
    where: { userId, projectId: { not: null } },
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
  });

  const trackerGroups = await prisma.llmTokenUsage.groupBy({
    by: ["trackerSchemaId"],
    where: { userId, trackerSchemaId: { not: null } },
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
  });

  const otherOnTrackerGroups = await prisma.llmTokenUsage.groupBy({
    by: ["trackerSchemaId"],
    where: {
      userId,
      trackerSchemaId: { not: null },
      NOT: { source: { startsWith: "analysis-" } },
    },
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
  });

  const analysisPipelineGroups = await prisma.llmTokenUsage.groupBy({
    by: ["trackerSchemaId", "analysisId"],
    where: {
      userId,
      trackerSchemaId: { not: null },
      source: { startsWith: "analysis-" },
    },
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
  });

  const projectIds = projectGroups
    .map((g) => g.projectId)
    .filter((id): id is string => id != null);
  const projects =
    projectIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: projectIds }, userId },
          select: { id: true, name: true },
        })
      : [];
  const projectNameById = Object.fromEntries(
    projects.map((p) => [p.id, p.name]),
  );

  const trackerIds = trackerGroups
    .map((g) => g.trackerSchemaId)
    .filter((id): id is string => id != null);
  const trackers =
    trackerIds.length > 0
      ? await prisma.trackerSchema.findMany({
          where: { id: { in: trackerIds }, project: { userId } },
          select: { id: true, name: true, projectId: true },
        })
      : [];
  const trackerMeta = Object.fromEntries(trackers.map((t) => [t.id, t]));

  const otherByTrackerId = Object.fromEntries(
    otherOnTrackerGroups
      .filter(
        (g): g is typeof g & { trackerSchemaId: string } =>
          g.trackerSchemaId != null,
      )
      .map((g) => [g.trackerSchemaId, sumRow(g)]),
  );

  const analysisIdsForLabels = [
    ...new Set(
      analysisPipelineGroups
        .map((g) => g.analysisId)
        .filter((id): id is string => id != null),
    ),
  ];
  const analysesForLabels =
    analysisIdsForLabels.length > 0
      ? await prisma.analysis.findMany({
          where: { id: { in: analysisIdsForLabels }, userId },
          select: {
            id: true,
            name: true,
            trackerSchemaId: true,
            trackerSchema: { select: { name: true } },
          },
        })
      : [];
  const analysisLabelById = Object.fromEntries(
    analysesForLabels.map((r) => [
      r.id,
      {
        name: r.name?.trim() || "Untitled analysis",
        dataTrackerName: r.trackerSchema?.name?.trim() || "Untitled tracker",
      },
    ]),
  );

  const analysisDetailsByTracker = new Map<string, LlmUsageAnalysisDetailRow[]>();
  for (const g of analysisPipelineGroups) {
    if (g.trackerSchemaId == null) continue;
    const tid = g.trackerSchemaId;
    const row = sumRow(g);
    if (
      row.totalTokens === 0 &&
      row.promptTokens === 0 &&
      row.completionTokens === 0
    )
      continue;

    let analysisName: string;
    let dataTrackerName: string;
    if (g.analysisId) {
      const labels = analysisLabelById[g.analysisId];
      analysisName = labels?.name ?? "Analysis";
      dataTrackerName =
        labels?.dataTrackerName ??
        (trackerMeta[tid]?.name?.trim() || "Untitled tracker");
    } else {
      analysisName = "Analysis runs (before per-analysis tracking)";
      dataTrackerName = trackerMeta[tid]?.name?.trim() || "Untitled tracker";
    }

    const list = analysisDetailsByTracker.get(tid) ?? [];
    list.push({
      analysisId: g.analysisId,
      analysisName,
      dataTrackerName,
      ...row,
    });
    analysisDetailsByTracker.set(tid, list);
  }
  for (const [, list] of analysisDetailsByTracker) {
    list.sort((a, b) => b.totalTokens - a.totalTokens);
  }

  return {
    totals: sumRow({ _sum: overall._sum }),
    byProject: projectGroups
      .filter((g): g is typeof g & { projectId: string } => g.projectId != null)
      .map((g) => ({
        projectId: g.projectId,
        name: projectNameById[g.projectId]?.trim() || "Untitled project",
        ...sumRow(g),
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens),
    byTracker: trackerGroups
      .filter(
        (g): g is typeof g & { trackerSchemaId: string } =>
          g.trackerSchemaId != null,
      )
      .map((g) => {
        const t = trackerMeta[g.trackerSchemaId];
        const totals = sumRow(g);
        return {
          trackerSchemaId: g.trackerSchemaId,
          name: t?.name?.trim() || "Untitled tracker",
          projectId: t?.projectId ?? null,
          ...totals,
          otherOnTracker: otherByTrackerId[g.trackerSchemaId] ?? {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
          },
          analysisDetails:
            analysisDetailsByTracker.get(g.trackerSchemaId) ?? [],
        };
      })
      .sort((a, b) => b.totalTokens - a.totalTokens),
  };
}
