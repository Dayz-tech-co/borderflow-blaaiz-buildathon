import { createHash, timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 10;

type RateEntry = { count: number; resetAt: number };
const mutationRates = new Map<string, RateEntry>();

export class SecurityConfigurationError extends Error {}

function configuredAdminToken(env: Record<string, string | undefined> = process.env): string {
  const token = env.BORDERFLOW_ADMIN_TOKEN;
  if (!token || token.length < 32) throw new SecurityConfigurationError("Payout administration is not configured.");
  return token;
}

export function isAdminAuthorized(request: Request, env: Record<string, string | undefined> = process.env): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7), "utf8");
  const expected = Buffer.from(configuredAdminToken(env), "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function checkMutationRateLimit(request: Request, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const key = createHash("sha256").update(request.headers.get("authorization") ?? "anonymous").digest("hex");
  const current = mutationRates.get(key);
  if (!current || current.resetAt <= now) {
    mutationRates.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= RATE_LIMIT_REQUESTS) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function readBoundedJson(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new Error("Request body is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("Request body is too large.");
  const value: unknown = JSON.parse(text);
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("JSON body must be an object.");
  return value as Record<string, unknown>;
}

export function resetRateLimitsForTests() { mutationRates.clear(); }
