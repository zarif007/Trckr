import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

export function getAuthSessionToken(req: NextRequest): string | undefined {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const value = req.cookies.get(cookieName)?.value;
    if (value) return value;
  }
  return undefined;
}

export function isAuthenticatedRequest(req: NextRequest): boolean {
  const token = getAuthSessionToken(req);
  return !!token && token.length > 0;
}
