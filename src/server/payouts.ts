import { createHash, randomUUID } from "node:crypto";
import { getDatabase, type PayoutRecord } from "./database";

export interface PayoutInput {
  recipientName: string;
  destinationAddress: string;
  assetCode: string;
  amount: string;
  idempotencyKey: string;
}

export function payloadHash(input: PayoutInput): string {
  const normalized = {
    recipientName: input.recipientName.trim(),
    destinationAddress: input.destinationAddress.trim(),
    assetCode: input.assetCode.trim().toUpperCase(),
    amount: input.amount.trim(),
    idempotencyKey: input.idempotencyKey.trim(),
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function createPendingPayout(input: PayoutInput, db = getDatabase()) {
  const now = new Date().toISOString();
  const hash = payloadHash(input);
  const existing = db.prepare("SELECT payloadHash FROM payouts WHERE idempotencyKey = ?").get(input.idempotencyKey.trim()) as { payloadHash: string } | undefined;
  if (existing) {
    if (existing.payloadHash !== hash) return { conflict: true as const };
    return { payout: findPayout(input.idempotencyKey.trim(), db), conflict: false as const };
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO payouts (
      id, idempotencyKey, recipientName, destinationAddress, assetCode, assetIssuer, amount,
      network, status, txHash, ledger, feeStroops, failureReason, submittedAt, confirmedAt,
      reconciledAt, createdAt, updatedAt, payloadHash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.idempotencyKey.trim(), input.recipientName.trim(), input.destinationAddress.trim(),
    input.assetCode.trim().toUpperCase(), null, input.amount.trim(), "testnet", "pending",
    null, null, null, null, null, null, null, now, now, hash,
  );
  return { payout: findPayout(id, db), conflict: false as const };
}

export function findPayout(idOrKey: string, db = getDatabase()) {
  const row = db.prepare(
    "SELECT * FROM payouts WHERE id = ? OR idempotencyKey = ? LIMIT 1",
  ).get(idOrKey, idOrKey) as (PayoutRecord & { payloadHash: string }) | undefined;
  if (!row) return null;
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    recipientName: row.recipientName,
    destinationAddress: row.destinationAddress,
    assetCode: row.assetCode,
    assetIssuer: row.assetIssuer,
    amount: row.amount,
    network: row.network,
    status: row.status,
    txHash: row.txHash,
    ledger: row.ledger,
    feeStroops: row.feeStroops,
    failureReason: row.failureReason,
    submittedAt: row.submittedAt,
    confirmedAt: row.confirmedAt,
    reconciledAt: row.reconciledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function markSubmitted(id: string, hash: string, ledger: number | null, fee: number | null, db = getDatabase()) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE payouts SET status = 'submitted', txHash = ?, ledger = ?, feeStroops = ?,
      submittedAt = ?, updatedAt = ?, failureReason = NULL WHERE id = ?
  `).run(hash, ledger, fee, now, now, id);
}

export function markFailed(id: string, reason: string, db = getDatabase()) {
  const now = new Date().toISOString();
  db.prepare("UPDATE payouts SET status = 'failed', failureReason = ?, updatedAt = ? WHERE id = ?").run(reason, now, id);
}

export function markReconciled(id: string, state: "confirmed" | "failed" | "missing", result?: { ledger?: number | null; feeCharged?: number | null; failureReason?: string }, db = getDatabase()) {
  const now = new Date().toISOString();
  if (state === "missing") {
    db.prepare("UPDATE payouts SET reconciledAt = ?, updatedAt = ? WHERE id = ?").run(now, now, id);
    return;
  }
  const confirmedAt = state === "confirmed" ? now : null;
  db.prepare(`
    UPDATE payouts SET status = ?, ledger = COALESCE(?, ledger), feeStroops = COALESCE(?, feeStroops),
      failureReason = ?, confirmedAt = COALESCE(?, confirmedAt), reconciledAt = ?, updatedAt = ? WHERE id = ?
  `).run(state, result?.ledger ?? null, result?.feeCharged ?? null, result?.failureReason ?? null, confirmedAt, now, now, id);
}
