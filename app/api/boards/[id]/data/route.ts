import { jsonOk, notFound, readParams, unauthorized } from "@/lib/api/http";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { executeBoardForUser } from "@/lib/boards/execute-board";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return unauthorized();

  const { id } = await readParams(context.params);
  const result = await executeBoardForUser(id, auth.user.id);
  if (!result.ok) {
    return notFound(result.error);
  }

  return jsonOk({ elements: result.elements });
}
