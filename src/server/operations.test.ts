import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import { backupDatabase, verifyDatabase } from "./database-operations";
import { createPendingPayout, findPayout } from "./payouts";
import { getDatabase } from "./database";
import { assertSettlementReady, operationalLog, readinessStatus } from "./operations";

describe("deployment operations", () => {
  const directories: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it("reports readiness with settlement safely disabled", () => {
    expect(readinessStatus({ STELLAR_NETWORK: "testnet", BORDERFLOW_SETTLEMENT_ENABLED: "false" }, ":memory:"))
      .toEqual({ ready: true, settlement: "disabled" });
  });

  it("fails closed when enabled settlement configuration is incomplete", () => {
    expect(() => assertSettlementReady({ STELLAR_NETWORK: "testnet", BORDERFLOW_SETTLEMENT_ENABLED: "true" })).toThrow();
    expect(readinessStatus({ STELLAR_NETWORK: "mainnet", BORDERFLOW_SETTLEMENT_ENABLED: "false" }, ":memory:").ready).toBe(false);
  });

  it("accepts complete Testnet settlement configuration without network access", () => {
    expect(() => assertSettlementReady({
      STELLAR_NETWORK: "testnet",
      STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
      STELLAR_SOURCE_SECRET: Keypair.random().secret(),
      BORDERFLOW_ADMIN_TOKEN: "a".repeat(32),
      BORDERFLOW_SETTLEMENT_ENABLED: "true",
    })).not.toThrow();
  });

  it("creates and verifies a restorable SQLite backup", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "borderflow-backup-test-"));
    directories.push(directory);
    const source = path.join(directory, "source.sqlite");
    const backup = path.join(directory, "backups", "backup.sqlite");
    const db = getDatabase(source);
    const created = createPendingPayout({
      recipientName: "Backup Test",
      destinationAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      assetCode: "XLM",
      amount: "1",
      idempotencyKey: "backup-test",
    }, db);
    db.close();
    await backupDatabase(source, backup);
    expect(() => verifyDatabase(backup)).not.toThrow();
    const restored = getDatabase(backup);
    expect(findPayout(created.payout!.id, restored)?.id).toBe(created.payout!.id);
    restored.close();
  });

  it("emits single-line structured logs with allowlisted context", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    operationalLog("info", "service.ready", { settlement: false });
    expect(() => JSON.parse(String(log.mock.calls[0][0]))).not.toThrow();
    expect(String(log.mock.calls[0][0])).not.toContain("authorization");
  });
});
