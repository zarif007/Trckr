import { z } from "zod";

import {
  badRequest,
  notFound,
  parseJsonBody,
  readParams,
  unauthorized,
} from "@/lib/api/http";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { getAnalysisForUser } from "@/lib/analysis/analysis-repository";
import {
  isAnalysisReplayable,
  runAnalysisPipeline,
} from "@/lib/analysis/orchestrator";
import {
  mergeQueryPlanWithOverrides,
  replayQueryOverridesSchema,
} from "@/lib/insights-query/query-plan-overrides";
import { parseQueryPlan, type QueryPlanV1 } from "@/lib/insights-query/schemas";

const bodySchema = z.object({
  prompt: z.string().optional(),
  regenerate: z.boolean().optional(),
  replayQueryOverrides: replayQueryOverridesSchema.optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const analysis = await getAnalysisForUser(id, auth.user.id);
  if (!analysis) return notFound("Analysis not found.");

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const prompt = parsed.data.prompt?.trim() ?? "";
  const regenerate = parsed.data.regenerate === true;
  const replayable = isAnalysisReplayable(analysis) && !regenerate;
  const savedPrompt = analysis.definition?.userPrompt?.trim() ?? "";

  if (!replayable && !prompt && !savedPrompt) {
    return badRequest("Prompt is required for the first run.");
  }

  let replayQueryPlan: QueryPlanV1 | undefined;
  if (replayable && parsed.data.replayQueryOverrides !== undefined) {
    const base = parseQueryPlan(analysis.definition?.queryPlan);
    if (!base) {
      return badRequest("Invalid saved recipe.");
    }
    const merged = mergeQueryPlanWithOverrides(
      base,
      parsed.data.replayQueryOverrides,
    );
    if (!merged.ok) {
      return badRequest(merged.error);
    }
    replayQueryPlan = merged.plan;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writeNdjsonLine = async (line: string) => {
        controller.enqueue(encoder.encode(line));
      };
      try {
        await runAnalysisPipeline({
          userId: auth.user.id,
          analysisId: id,
          userPrompt: prompt || savedPrompt,
          regenerate,
          replayQueryPlan,
          writeNdjsonLine,
        });
      } catch (error) {
        // `withTracedRun` emits an `error` NDJSON line before rethrowing; log for server diagnostics.
        const message =
          error instanceof Error ? error.message : "Analysis pipeline failed";
        console.error("[POST /api/analyses/[id]/generate]", message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
