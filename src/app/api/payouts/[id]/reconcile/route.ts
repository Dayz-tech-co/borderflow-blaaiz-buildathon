import { NextResponse } from "next/server";
import { findPayout, markReconciled } from "@/server/payouts";
import { getStellarConfig, reconcileTransaction } from "@/server/stellar";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Unable to reconcile payout at this time." }, { status: 502 });
  }
}
