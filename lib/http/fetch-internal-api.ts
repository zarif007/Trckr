import "server-only";
import { headers } from "next/headers";

function buildSameOriginBaseUrl(headerList: Headers): string {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    const port = process.env.PORT ?? "3000";
    return `http://127.0.0.1:${port}`;
  }
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Calls this app's Route Handlers from server-only code (e.g. a Server
 * Component) with a fully qualified URL and the incoming request Cookie
 * header so `auth()` in API routes resolves the session.
 *
 * Relative paths like `/api/...` are invalid for Node `fetch` during SSR.
 */
export async function fetchInternalApi(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headerList = await headers();
  const base = buildSameOriginBaseUrl(headerList);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, `${base}/`);
  const cookie = headerList.get("cookie");
  const nextHeaders = new Headers(init?.headers ?? undefined);
  if (cookie) {
    nextHeaders.set("cookie", cookie);
  }
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: nextHeaders,
  });
}
