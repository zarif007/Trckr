import type { JSONParseError, TypeValidationError } from "ai";

/**
 * Strip markdown fences and isolate the outermost `{...}` or `[...]` so `generateObject` can parse.
 */
export async function repairStructuredJsonText(options: {
  text: string;
  error: JSONParseError | TypeValidationError;
}): Promise<string | null> {
  void options.error;
  const raw = options.text.trim();
  if (!raw) return null;

  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(raw);
  const body = (fence ? fence[1] : raw).trim();

  const objStart = body.indexOf("{");
  const objEnd = body.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    return body.slice(objStart, objEnd + 1);
  }

  const arrStart = body.indexOf("[");
  const arrEnd = body.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    return body.slice(arrStart, arrEnd + 1);
  }

  return null;
}
