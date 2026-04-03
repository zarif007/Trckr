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
  reportId?: string | null;
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
      reportId: params.reportId ?? null,
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

export type LlmUsageReportDetailRow = LlmUsageDashboardRow & {
  reportId: string | null;
  reportName: string;
  dataTrackerName: string;
};

export type LlmUsageByTrackerBreakdownRow = LlmUsageByTrackerRow & {
  otherOnTracker: LlmUsageDashboardRow;
  reportDetails: LlmUsageReportDetailRow[];
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
      NOT: { source: { startsWith: "report-" } },
    },
    _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
  });

  const reportPipelineGroups = await prisma.llmTokenUsage.groupBy({
    by: ["trackerSchemaId", "reportId"],
    where: {
      userId,
      trackerSchemaId: { not: null },
      source: { startsWith: "report-" },
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

  const reportIdsForLabels = [
    ...new Set(
      reportPipelineGroups
        .map((g) => g.reportId)
        .filter((id): id is string => id != null),
    ),
  ];
  const reportsForLabels =
    reportIdsForLabels.length > 0
      ? await prisma.report.findMany({
          where: { id: { in: reportIdsForLabels }, userId },
          select: {
            id: true,
            name: true,
            trackerSchemaId: true,
            trackerSchema: { select: { name: true } },
          },
        })
      : [];
  const reportLabelById = Object.fromEntries(
    reportsForLabels.map((r) => [
      r.id,
      {
        name: r.name?.trim() || "Untitled report",
        dataTrackerName: r.trackerSchema?.name?.trim() || "Untitled tracker",
      },
    ]),
  );

  const reportDetailsByTracker = new Map<string, LlmUsageReportDetailRow[]>();
  for (const g of reportPipelineGroups) {
    if (g.trackerSchemaId == null) continue;
    const tid = g.trackerSchemaId;
    const row = sumRow(g);
    if (
      row.totalTokens === 0 &&
      row.promptTokens === 0 &&
      row.completionTokens === 0
    )
      continue;

    let reportName: string;
    let dataTrackerName: string;
    if (g.reportId) {
      const labels = reportLabelById[g.reportId];
      reportName = labels?.name ?? "Report";
      dataTrackerName =
        labels?.dataTrackerName ??
        (trackerMeta[tid]?.name?.trim() || "Untitled tracker");
    } else {
      reportName = "Report runs (before per-report tracking)";
      dataTrackerName = trackerMeta[tid]?.name?.trim() || "Untitled tracker";
    }

    const list = reportDetailsByTracker.get(tid) ?? [];
    list.push({
      reportId: g.reportId,
      reportName,
      dataTrackerName,
      ...row,
    });
    reportDetailsByTracker.set(tid, list);
  }
  for (const [, list] of reportDetailsByTracker) {
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
          reportDetails: reportDetailsByTracker.get(g.trackerSchemaId) ?? [],
        };
      })
      .sort((a, b) => b.totalTokens - a.totalTokens),
  };
}
