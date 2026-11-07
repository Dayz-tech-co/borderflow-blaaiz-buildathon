import { describe, expect, it } from "vitest";
import { payloadHash } from "./payouts";

describe("payout idempotency fingerprints", () => {
  const input = {
    recipientName: "Ada",
    destinationAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    assetCode: "XLM",
    amount: "1.0000000",
    idempotencyKey: "bf-test-1",
  };

  it("is stable for equivalent normalized payloads", () => {
    expect(payloadHash(input)).toBe(payloadHash({ ...input, assetCode: "xlm", recipientName: " Ada " }));
  });

  it("changes when payout data changes", () => {
    expect(payloadHash(input)).not.toBe(payloadHash({ ...input, amount: "2" }));
  });
});
