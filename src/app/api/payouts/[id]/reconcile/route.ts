import { NextResponse } from "next/server";
import { findPayout, markReconciled } from "@/server/payouts";
import { getStellarConfig, reconcileTransaction } from "@/server/stellar";
import { checkMutationRateLimit, isAdminAuthorized, SecurityConfigurationError } from "@/server/security";
import { operationalLog } from "@/server/operations";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdminAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SecurityConfigurationError ? "Payout administration is unavailable." : "Unauthorized." }, { status: error instanceof SecurityConfigurationError ? 503 : 401 });
  }
  const rate = checkMutationRateLimit(request);
  if (!rate.allowed) return NextResponse.json({ error: "Too many management requests." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const { id } = await context.params;
  const payout = findPayout(id);
  if (!payout) return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  if (!payout.txHash) return NextResponse.json({ error: "Payout has no submitted transaction hash." }, { status: 409 });

  try {
    const config = getStellarConfig();
    const result = await reconcileTransaction(payout.txHash, config.horizonUrl);
    if (result.state === "missing") markReconciled(id, "missing");
    else if (result.state === "confirmed") markReconciled(id, "confirmed", result);
    else if (result.state === "failed") markReconciled(id, "failed", result);
    return NextResponse.json(findPayout(id));
  } catch {
    operationalLog("error", "payout.reconciliation_failed", { payoutId: id });
    return NextResponse.json({ error: "Unable to reconcile payout at this time." }, { status: 502 });
  }
}
