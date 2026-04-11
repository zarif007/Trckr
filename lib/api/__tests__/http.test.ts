import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  badRequest,
  jsonOk,
  parseJsonBody,
  readParams,
  requireParam,
} from "../http";

describe("parseJsonBody", () => {
  it("returns bad request when JSON is invalid", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const r = await parseJsonBody(req, z.object({ a: z.string() }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("returns parsed data on success", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ a: "ok" }),
      headers: { "Content-Type": "application/json" },
    });
    const r = await parseJsonBody(req, z.object({ a: z.string() }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ a: "ok" });
  });
});

describe("jsonOk / badRequest", () => {
  it("jsonOk returns 200 JSON body", async () => {
    const res = jsonOk({ x: 1 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ x: 1 });
  });

  it("badRequest returns 400 with error message", async () => {
    const res = badRequest("nope");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "nope" });
  });
});

describe("readParams / requireParam", () => {
  it("readParams awaits params promise", async () => {
    const p = readParams(Promise.resolve({ id: "abc" }));
    await expect(p).resolves.toEqual({ id: "abc" });
  });

  it("requireParam returns null for empty string", () => {
    expect(requireParam("", "id")).toBeNull();
  });
});
