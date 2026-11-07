import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export type PayoutStatus = "draft" | "pending" | "submitted" | "confirmed" | "failed";

export interface PayoutRecord {
  id: string;
  idempotencyKey: string;
  recipientName: string;
  destinationAddress: string;
  assetCode: string;
  assetIssuer: string | null;
  amount: string;
  network: string;
  status: PayoutStatus;
  txHash: string | null;
  ledger: number | null;
  feeStroops: number | null;
  failureReason: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  reconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const databasePath = process.env.BORDERFLOW_DATABASE_PATH ?? path.join(process.cwd(), "data", "borderflow.sqlite");

export function getDatabase(filename = databasePath): Database.Database {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      idempotencyKey TEXT NOT NULL UNIQUE,
      recipientName TEXT NOT NULL,
      destinationAddress TEXT NOT NULL,
      assetCode TEXT NOT NULL,
      assetIssuer TEXT,
      amount TEXT NOT NULL,
      network TEXT NOT NULL,
      status TEXT NOT NULL,
      txHash TEXT UNIQUE,
      ledger INTEGER,
      feeStroops INTEGER,
      failureReason TEXT,
      submittedAt TEXT,
      confirmedAt TEXT,
      reconciledAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      payloadHash TEXT NOT NULL
    );
  `);
  return db;
}

export function allPayouts(db = getDatabase()) {
  return db.prepare("SELECT * FROM payouts ORDER BY createdAt DESC").all() as (PayoutRecord & { payloadHash: string })[];
}
