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

const bodySchema = z.object({
  prompt: z.string().optional(),
  regenerate: z.boolean().optional(),
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
          writeNdjsonLine,
        });
      } catch {
        // Orchestrator forwards errors when possible.
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
