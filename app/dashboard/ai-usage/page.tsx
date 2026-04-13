import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { LlmUsageDashboardRow } from "@/lib/llm-usage";
import { getLlmUsageDashboard } from "@/lib/llm-usage";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

const cardSectionClass = cn(
  theme.radius.md,
  "border bg-card p-6",
  theme.uiChrome.border,
);

const tableHeadRowClass = cn(
  "border-b text-left text-muted-foreground",
  theme.uiChrome.border,
);

const tableRowClass = cn("border-b", theme.uiChrome.border, "last:border-b-0");

function formatTokens(n: number): string {
  return n.toLocaleString();
}

function sumRows(rows: LlmUsageDashboardRow[]): LlmUsageDashboardRow {
  return rows.reduce(
    (acc, r) => ({
      totalTokens: acc.totalTokens + r.totalTokens,
      promptTokens: acc.promptTokens + r.promptTokens,
      completionTokens: acc.completionTokens + r.completionTokens,
    }),
    { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
  );
}

function hasTokens(r: LlmUsageDashboardRow): boolean {
  return r.totalTokens > 0 || r.promptTokens > 0 || r.completionTokens > 0;
}

export default async function DashboardAiUsagePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/api/auth/signin");
  }

  const data = await getLlmUsageDashboard(userId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          AI token usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens from the model provider for your account, scoped to projects
          and trackers when known. Under each tracker, report AI is split out,
          then shown per report with the data tracker name.
        </p>
      </div>

      <section className={cardSectionClass}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your account total
        </h2>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Total tokens</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatTokens(data.totals.totalTokens)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Input tokens</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatTokens(data.totals.promptTokens)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Output tokens</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatTokens(data.totals.completionTokens)}
            </dd>
          </div>
        </dl>
      </section>

      <section className={cardSectionClass}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By project
        </h2>
        {data.byProject.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No project-scoped usage recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRowClass}>
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Total</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Input</th>
                  <th className="pb-2 font-medium tabular-nums">Output</th>
                </tr>
              </thead>
              <tbody>
                {data.byProject.map((row) => (
                  <tr key={row.projectId} className={tableRowClass}>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/project/${row.projectId}`}
                        className="text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatTokens(row.totalTokens)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatTokens(row.promptTokens)}
                    </td>
                    <td className="py-2 tabular-nums">
                      {formatTokens(row.completionTokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={cardSectionClass}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By tracker
        </h2>
        {data.byTracker.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tracker-scoped usage recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRowClass}>
                  <th className="pb-2 pr-4 font-medium">Tracker / breakdown</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Total</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Input</th>
                  <th className="pb-2 font-medium tabular-nums">Output</th>
                </tr>
              </thead>
              <tbody>
                {data.byTracker.map((row) => {
                  const reportsTotal = sumRows(row.reportDetails);
                  const hasReports = row.reportDetails.length > 0;
                  const hasOther = hasTokens(row.otherOnTracker);
                  const showNestedBreakdown =
                    hasReports ||
                    (hasOther &&
                      row.otherOnTracker.totalTokens < row.totalTokens);

                  if (!showNestedBreakdown) {
                    return (
                      <tr key={row.trackerSchemaId} className={tableRowClass}>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/tracker/${row.trackerSchemaId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {formatTokens(row.totalTokens)}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {formatTokens(row.promptTokens)}
                        </td>
                        <td className="py-2 tabular-nums">
                          {formatTokens(row.completionTokens)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <Fragment key={row.trackerSchemaId}>
                      <tr className={tableRowClass}>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/tracker/${row.trackerSchemaId}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {row.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 font-medium tabular-nums">
                          {formatTokens(row.totalTokens)}
                        </td>
                        <td className="py-2 pr-4 font-medium tabular-nums">
                          {formatTokens(row.promptTokens)}
                        </td>
                        <td className="py-2 font-medium tabular-nums">
                          {formatTokens(row.completionTokens)}
                        </td>
                      </tr>
                      {hasTokens(row.otherOnTracker) ? (
                        <tr
                          className={cn(
                            "border-b bg-muted/20",
                            theme.uiChrome.border,
                          )}
                        >
                          <td className="py-1.5 pr-4 pl-6 text-muted-foreground">
                            Other AI (this tracker)
                          </td>
                          <td className="py-1.5 pr-4 tabular-nums text-muted-foreground">
                            {formatTokens(row.otherOnTracker.totalTokens)}
                          </td>
                          <td className="py-1.5 pr-4 tabular-nums text-muted-foreground">
                            {formatTokens(row.otherOnTracker.promptTokens)}
                          </td>
                          <td className="py-1.5 tabular-nums text-muted-foreground">
                            {formatTokens(row.otherOnTracker.completionTokens)}
                          </td>
                        </tr>
                      ) : null}
                      {row.reportDetails.length > 0 ? (
                        <>
                          <tr
                            className={cn(
                              "border-b bg-muted/10",
                              theme.uiChrome.border,
                            )}
                          >
                            <td className="py-1.5 pr-4 pl-6 font-medium text-muted-foreground">
                              Reports
                            </td>
                            <td className="py-1.5 pr-4 font-medium tabular-nums text-muted-foreground">
                              {formatTokens(reportsTotal.totalTokens)}
                            </td>
                            <td className="py-1.5 pr-4 font-medium tabular-nums text-muted-foreground">
                              {formatTokens(reportsTotal.promptTokens)}
                            </td>
                            <td className="py-1.5 font-medium tabular-nums text-muted-foreground">
                              {formatTokens(reportsTotal.completionTokens)}
                            </td>
                          </tr>
                          {row.reportDetails.map((detail, i) => (
                            <tr
                              key={`${row.trackerSchemaId}-r-${detail.reportId ?? `legacy-${i}`}`}
                              className={tableRowClass}
                            >
                              <td className="py-1.5 pr-4 pl-10">
                                <div className="font-medium text-foreground">
                                  {detail.dataTrackerName}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {detail.reportId ? (
                                    <Link
                                      href={`/report/${detail.reportId}`}
                                      className="text-primary hover:underline"
                                    >
                                      {detail.reportName}
                                    </Link>
                                  ) : (
                                    detail.reportName
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 pr-4 tabular-nums">
                                {formatTokens(detail.totalTokens)}
                              </td>
                              <td className="py-1.5 pr-4 tabular-nums">
                                {formatTokens(detail.promptTokens)}
                              </td>
                              <td className="py-1.5 tabular-nums">
                                {formatTokens(detail.completionTokens)}
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
