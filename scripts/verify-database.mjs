import Database from "better-sqlite3";
import path from "node:path";

const filename = process.env.BORDERFLOW_BACKUP_PATH;
if (!filename || !path.isAbsolute(filename)) throw new Error("BORDERFLOW_BACKUP_PATH must be an absolute path.");
const database = new Database(filename, { readonly: true, fileMustExist: true });
try {
  if (database.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("SQLite integrity check failed.");
  database.prepare("SELECT COUNT(*) FROM payouts").get();
} finally { database.close(); }
console.info(JSON.stringify({ event: "database.backup_verified", filename }));
