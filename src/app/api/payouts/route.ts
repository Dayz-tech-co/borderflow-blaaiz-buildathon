import { NextResponse } from "next/server";
import { buildNativePayment, getStellarConfig, isValidAddress, parsePositiveAmount, submitTransaction } from "@/server/stellar";
import { createPendingPayout, markFailed, markSubmitted } from "@/server/payouts";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const recipientName = String(body.recipientName ?? "").trim();
  const destinationAddress = String(body.destinationAddress ?? "").trim();
  const assetCode = String(body.assetCode ?? "").trim().toUpperCase();
  const amount = String(body.amount ?? "");
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();

  if (!recipientName || !destinationAddress || !idempotencyKey) {
    return NextResponse.json({ error: "recipientName, destinationAddress, and idempotencyKey are required." }, { status: 400 });
  }
  if (assetCode !== "XLM") return NextResponse.json({ error: "Only XLM is supported in this baseline." }, { status: 400 });
  if (!isValidAddress(destinationAddress)) return NextResponse.json({ error: "Invalid Stellar destination address." }, { status: 400 });
  try { parsePositiveAmount(amount); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid amount." }, { status: 400 });
  }

  const input = { recipientName, destinationAddress, assetCode, amount, idempotencyKey };
  const result = createPendingPayout(input);
  if (result.conflict) return NextResponse.json({ error: "Idempotency key was reused with different payout data." }, { status: 409 });
  if (!result.payout) return NextResponse.json({ error: "Unable to persist payout." }, { status: 500 });
  if (result.payout.status !== "pending") return NextResponse.json(result.payout);

  try {
    const config = getStellarConfig();
    const transaction = await buildNativePayment({
      sourceSecret: config.sourceSecret,
      destinationAddress,
      amount: parsePositiveAmount(amount),
      horizonUrl: config.horizonUrl,
    });
    const submission = await submitTransaction(transaction.toXDR(), config.horizonUrl);
    if (!submission.submitted || !("hash" in submission) || !submission.hash) {
      const failureReason = "failureReason" in submission && typeof submission.failureReason === "string"
        ? submission.failureReason
        : "Stellar submission failed.";
      markFailed(result.payout.id, failureReason);
      return NextResponse.json({ ...result.payout, status: "failed", failureReason });
    }
    markSubmitted(result.payout.id, submission.hash, submission.ledger, submission.feeCharged);
    return NextResponse.json({
      ...result.payout,
      status: "submitted",
      txHash: submission.hash,
      ledger: submission.ledger,
      feeStroops: submission.feeCharged,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Stellar submission failed.";
    markFailed(result.payout.id, reason);
    return NextResponse.json({ ...result.payout, status: "failed", failureReason: reason }, { status: 502 });
  }
}
