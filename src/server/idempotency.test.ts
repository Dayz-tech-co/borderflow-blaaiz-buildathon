import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { claimPendingPayout, createPendingPayout, findPayout, payloadHash } from "./payouts";
import { getDatabase } from "./database";

const input = {
  recipientName: "Ada",
  destinationAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  assetCode: "XLM",
  amount: "1.0000000",
  idempotencyKey: "bf-test-1",
};

describe("payout idempotency fingerprints", () => {
  it("is stable for equivalent normalized payloads", () => {
    expect(payloadHash(input)).toBe(payloadHash({ ...input, assetCode: "xlm", recipientName: " Ada " }));
  });

  it("changes when payout data changes", () => {
    expect(payloadHash(input)).not.toBe(payloadHash({ ...input, amount: "2" }));
  });
});

describe("atomic payout idempotency", () => {
  const paths: string[] = [];
  afterEach(() => { for (const filename of paths.splice(0)) fs.rmSync(path.dirname(filename), { recursive: true, force: true }); });

  it("allows only one concurrent submission claim", () => {
    const db = getDatabase(":memory:");
    const first = createPendingPayout(input, db);
    const replay = createPendingPayout(input, db);
    expect(first.conflict).toBe(false);
    expect(replay.conflict).toBe(false);
    expect(first.payout?.id).toBe(replay.payout?.id);
    expect(claimPendingPayout(first.payout!.id, db)).toBe(true);
    expect(claimPendingPayout(first.payout!.id, db)).toBe(false);
    db.close();
  });

  it("rejects a conflicting idempotency key atomically", () => {
    const db = getDatabase(":memory:");
    createPendingPayout(input, db);
    expect(createPendingPayout({ ...input, amount: "2" }, db).conflict).toBe(true);
    db.close();
  });

  it("preserves payout state across database restarts", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "borderflow-test-"));
    const filename = path.join(directory, "payouts.sqlite");
    paths.push(filename);
    const firstDb = getDatabase(filename);
    const created = createPendingPayout(input, firstDb);
    firstDb.close();
    const reopened = getDatabase(filename);
    expect(findPayout(created.payout!.id, reopened)?.idempotencyKey).toBe(input.idempotencyKey);
    reopened.close();
  });
});
