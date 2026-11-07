import { describe, expect, it } from "vitest";
import { isAdminAuthorized, readBoundedJson, SecurityConfigurationError } from "./security";

describe("payout API security", () => {
  const token = "a".repeat(32);

  it("requires a valid server-side administrator bearer token", () => {
    expect(isAdminAuthorized(new Request("https://example.test"), { BORDERFLOW_ADMIN_TOKEN: token })).toBe(false);
    expect(isAdminAuthorized(new Request("https://example.test", { headers: { authorization: `Bearer ${token}` } }), { BORDERFLOW_ADMIN_TOKEN: token })).toBe(true);
    expect(isAdminAuthorized(new Request("https://example.test", { headers: { authorization: "Bearer wrong" } }), { BORDERFLOW_ADMIN_TOKEN: token })).toBe(false);
  });

  it("fails closed when the administrator token is not securely configured", () => {
    expect(() => isAdminAuthorized(new Request("https://example.test", { headers: { authorization: "Bearer value" } }), {})).toThrow(SecurityConfigurationError);
  });

  it("rejects oversized request bodies", async () => {
    const request = new Request("https://example.test", { method: "POST", body: JSON.stringify({ value: "x".repeat(9000) }) });
    await expect(readBoundedJson(request)).rejects.toThrow(/too large/i);
  });
});
