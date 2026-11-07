import { describe, expect, it } from "vitest";
import {
  explorerTransactionUrl,
  getStellarConfig,
  isValidAddress,
  parsePositiveAmount,
  reconcileTransaction,
  validatePayoutAmount,
} from "./stellar";

describe("Stellar configuration and validation", () => {
  it("requires Testnet", () => {
    expect(() => getStellarConfig({ STELLAR_NETWORK: "mainnet", STELLAR_SOURCE_SECRET: "S" })).toThrow(/testnet/i);
  });

  it("rejects a missing source secret", () => {
    expect(() => getStellarConfig({ STELLAR_NETWORK: "testnet" })).toThrow(/required/i);
  });

  it("accepts positive XLM amounts with no more than seven decimals", () => {
    expect(parsePositiveAmount("1.25")).toBe("1.25");
    expect(parsePositiveAmount("1000000")).toBe("1000000");
  });

  it("rejects invalid XLM amounts", () => {
    expect(() => parsePositiveAmount("0")).toThrow();
    expect(() => parsePositiveAmount("-1")).toThrow();
    expect(() => parsePositiveAmount("1.12345678")).toThrow();
    expect(() => parsePositiveAmount("NaN")).toThrow();
  });

  it("enforces the configured payout ceiling", () => {
    expect(validatePayoutAmount("1", { BORDERFLOW_MAX_PAYOUT_XLM: "1" })).toBe("1");
    expect(() => validatePayoutAmount("1.0000001", { BORDERFLOW_MAX_PAYOUT_XLM: "1" })).toThrow(/maximum/i);
  });

  it("rejects malformed Stellar addresses", () => {
    expect(isValidAddress("not-an-address")).toBe(false);
  });

  it("validates and creates Testnet explorer URLs", () => {
    const hash = "a".repeat(64);
    expect(explorerTransactionUrl(hash)).toContain("/testnet/tx/" + hash);
    expect(() => explorerTransactionUrl("short")).toThrow(/hash/i);
  });

  it("reconciles a mocked confirmed transaction", async () => {
    const fetcher = async () => new Response(JSON.stringify({
      successful: true,
      ledger: 12345,
      fee_charged: "100",
    }), { status: 200 });
    await expect(reconcileTransaction("a".repeat(64), "https://example.test", fetcher)).resolves.toEqual({
      state: "confirmed",
      ledger: 12345,
      feeCharged: 100,
    });
  });

  it("treats Horizon errors as pending without exposing its response", async () => {
    const fetcher = async () => new Response("upstream secret detail", { status: 503 });
    await expect(reconcileTransaction("a".repeat(64), "https://example.test", fetcher)).resolves.toEqual({ state: "pending" });
  });
});
