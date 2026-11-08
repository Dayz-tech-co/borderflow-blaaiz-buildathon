import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export async function backupDatabase(source: string, destination: string) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try { await db.backup(destination); } finally { db.close(); }
  verifyDatabase(destination);
}

export function verifyDatabase(filename: string) {
  const db = new Database(filename, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error("SQLite integrity check failed.");
    db.prepare("SELECT COUNT(*) AS count FROM payouts").get();
  } finally { db.close(); }
}
