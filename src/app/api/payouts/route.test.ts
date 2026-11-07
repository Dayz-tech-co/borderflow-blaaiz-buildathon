import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/payouts authorization", () => {
  beforeEach(() => { process.env.BORDERFLOW_ADMIN_TOKEN = "a".repeat(32); });

  it("does not execute network activity when authorization fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(new Request("https://example.test/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientName: "Ada", destinationAddress: "invalid", assetCode: "XLM", amount: "1", idempotencyKey: "test" }),
    }));
    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not execute network activity while settlement is disabled", async () => {
    process.env.BORDERFLOW_SETTLEMENT_ENABLED = "false";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(new Request("https://example.test/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${"a".repeat(32)}` },
      body: "{}",
    }));
    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
