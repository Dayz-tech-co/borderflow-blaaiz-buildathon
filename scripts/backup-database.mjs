import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const source = process.env.BORDERFLOW_DATABASE_PATH;
const backupDirectory = process.env.BORDERFLOW_BACKUP_DIRECTORY;
if (!source || !path.isAbsolute(source)) throw new Error("BORDERFLOW_DATABASE_PATH must be an absolute path.");
if (!backupDirectory || !path.isAbsolute(backupDirectory)) throw new Error("BORDERFLOW_BACKUP_DIRECTORY must be an absolute path.");

fs.mkdirSync(backupDirectory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-");
const destination = path.join(backupDirectory, `borderflow-${stamp}.sqlite`);
const database = new Database(source, { readonly: true, fileMustExist: true });
try { await database.backup(destination); } finally { database.close(); }

const backup = new Database(destination, { readonly: true, fileMustExist: true });
try {
  if (backup.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("Backup integrity check failed.");
  backup.prepare("SELECT COUNT(*) FROM payouts").get();
} finally { backup.close(); }

console.info(JSON.stringify({ event: "database.backup_created", destination }));
