import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureConversation, persistMessage } from "./conversation";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("conversation API helpers", () => {
  it("ensureConversation returns id when API succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "conv_123" }),
      }),
    );

    await expect(ensureConversation("tracker_1")).resolves.toBe("conv_123");
  });

  it("ensureConversation throws API error when request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Tracker not found" }),
      }),
    );

    await expect(ensureConversation("tracker_404")).rejects.toThrow(
      "Tracker not found",
    );
  });

  it("persistMessage throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Failed to save message" }),
      }),
    );

    await expect(
      persistMessage("conv_1", { role: "USER", content: "Hello" }),
    ).rejects.toThrow("Failed to save message");
  });
});
