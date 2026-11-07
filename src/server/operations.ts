import { getDatabase } from "./database";
import { getStellarConfig } from "./stellar";

interface OperationalContext {
  payoutId?: string;
  settlement?: boolean;
}

export function operationalLog(level: "info" | "warn" | "error", event: string, context: OperationalContext = {}) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export function isSettlementEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BORDERFLOW_SETTLEMENT_ENABLED === "true";
}

export function assertSettlementReady(env: Record<string, string | undefined> = process.env) {
  if (!isSettlementEnabled(env)) throw new Error("Settlement is disabled.");
  const adminToken = env.BORDERFLOW_ADMIN_TOKEN;
  if (!adminToken || adminToken.length < 32) throw new Error("Administrator access is not configured.");
  getStellarConfig(env);
}

export function readinessStatus(env: Record<string, string | undefined> = process.env, databaseFilename?: string) {
  if (env.STELLAR_NETWORK !== "testnet") return { ready: false as const, settlement: "unavailable" as const };
  try {
    const db = getDatabase(databaseFilename);
    try { db.prepare("SELECT 1").get(); } finally { db.close(); }
    if (isSettlementEnabled(env)) assertSettlementReady(env);
    return { ready: true as const, settlement: isSettlementEnabled(env) ? "enabled" as const : "disabled" as const };
  } catch {
    return { ready: false as const, settlement: "unavailable" as const };
  }
}
