import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getLlmUsageDashboard } from '@/lib/llm-usage'

function formatTokens(n: number): string {
  return n.toLocaleString()
}

export default async function DashboardUsagePage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    redirect('/api/auth/signin')
  }

  const data = await getLlmUsageDashboard(userId)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI token usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tokens reported by the model provider for your account. Breakdowns include rows where a project or
          tracker was known for that request.
        </p>
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
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

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By project
        </h2>
        {data.byProject.length === 0 ? (
          <p className="text-sm text-muted-foreground">No project-scoped usage recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Total</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Input</th>
                  <th className="pb-2 font-medium tabular-nums">Output</th>
                </tr>
              </thead>
              <tbody>
                {data.byProject.map((row) => (
                  <tr key={row.projectId} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/project/${row.projectId}`}
                        className="text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{formatTokens(row.totalTokens)}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatTokens(row.promptTokens)}</td>
                    <td className="py-2 tabular-nums">{formatTokens(row.completionTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By tracker
        </h2>
        {data.byTracker.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracker-scoped usage recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Tracker</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Total</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Input</th>
                  <th className="pb-2 font-medium tabular-nums">Output</th>
                </tr>
              </thead>
              <tbody>
                {data.byTracker.map((row) => (
                  <tr key={row.trackerSchemaId} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/tracker/${row.trackerSchemaId}`}
                        className="text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{formatTokens(row.totalTokens)}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatTokens(row.promptTokens)}</td>
                    <td className="py-2 tabular-nums">{formatTokens(row.completionTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
