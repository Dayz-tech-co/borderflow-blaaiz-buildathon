import { NextResponse } from "next/server";
import { buildNativePayment, getStellarConfig, isValidAddress, submitTransaction, validatePayoutAmount } from "@/server/stellar";
import { claimPendingPayout, createPendingPayout, findPayout, markFailed, markPrepared, markSubmissionUnknown, markSubmitted } from "@/server/payouts";
import { checkMutationRateLimit, isAdminAuthorized, readBoundedJson, SecurityConfigurationError } from "@/server/security";
import { assertSettlementReady, operationalLog } from "@/server/operations";

function authorize(request: Request): NextResponse | null {
  try {
    return isAdminAuthorized(request) ? null : NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SecurityConfigurationError ? "Payout administration is unavailable." : "Unauthorized." }, { status: error instanceof SecurityConfigurationError ? 503 : 401 });
  }
}

export async function POST(request: Request) {
  const unauthorized = authorize(request);
  if (unauthorized) {
    operationalLog("warn", "payout.authorization_denied");
    return unauthorized;
  }
  try { assertSettlementReady(); } catch {
    operationalLog("warn", "payout.settlement_unavailable");
    return NextResponse.json({ error: "Settlement is unavailable." }, { status: 503 });
  }
  const rate = checkMutationRateLimit(request);
  if (!rate.allowed) return NextResponse.json({ error: "Too many payout requests." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  let body: Record<string, unknown>;
  try { body = await readBoundedJson(request); } catch (error) {
    const tooLarge = error instanceof Error && error.message.includes("too large");
    return NextResponse.json({ error: tooLarge ? "Request body is too large." : "Invalid JSON body." }, { status: tooLarge ? 413 : 400 });
  }

  const recipientName = String(body.recipientName ?? "").trim();
  const destinationAddress = String(body.destinationAddress ?? "").trim();
  const assetCode = String(body.assetCode ?? "").trim().toUpperCase();
  const amount = String(body.amount ?? "");
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  const network = String(body.network ?? "testnet").trim().toLowerCase();

  if (!recipientName || !destinationAddress || !idempotencyKey) return NextResponse.json({ error: "recipientName, destinationAddress, and idempotencyKey are required." }, { status: 400 });
  if (recipientName.length > 120 || idempotencyKey.length > 128) return NextResponse.json({ error: "A payout field exceeds its allowed length." }, { status: 400 });
  if (network !== "testnet") return NextResponse.json({ error: "Only Stellar Testnet is supported." }, { status: 400 });
  if (assetCode !== "XLM") return NextResponse.json({ error: "Only XLM is supported in this baseline." }, { status: 400 });
  if (!isValidAddress(destinationAddress)) return NextResponse.json({ error: "Invalid Stellar destination address." }, { status: 400 });

  let validatedAmount: string;
  try { validatedAmount = validatePayoutAmount(amount); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid amount." }, { status: 400 });
  }

  const result = createPendingPayout({ recipientName, destinationAddress, assetCode, amount: validatedAmount, idempotencyKey });
  if (result.conflict) return NextResponse.json({ error: "Idempotency key was reused with different payout data." }, { status: 409 });
  if (!result.payout) return NextResponse.json({ error: "Unable to persist payout." }, { status: 500 });
  if (!claimPendingPayout(result.payout.id)) return NextResponse.json(findPayout(result.payout.id), { status: result.payout.status === "processing" ? 202 : 200 });

  let transaction: Awaited<ReturnType<typeof buildNativePayment>>;
  let horizonUrl: string;
  try {
    const config = getStellarConfig();
    horizonUrl = config.horizonUrl;
    transaction = await buildNativePayment({ sourceSecret: config.sourceSecret, destinationAddress, amount: validatedAmount, horizonUrl: config.horizonUrl });
    const expectedHash = Buffer.from(transaction.hash()).toString("hex");
    if (!markPrepared(result.payout.id, expectedHash)) throw new Error("Unable to reserve transaction hash.");
  } catch {
    markFailed(result.payout.id, "Unable to prepare Stellar transaction.");
    operationalLog("error", "payout.preparation_failed", { payoutId: result.payout.id });
    return NextResponse.json({ error: "Unable to prepare payout." }, { status: 502 });
  }

  try {
    const submission = await submitTransaction(transaction.toXDR(), horizonUrl);
    if (!submission.submitted || !("hash" in submission) || !submission.hash) {
      const reason = "failureReason" in submission && typeof submission.failureReason === "string" ? submission.failureReason : "Stellar transaction rejected";
      markFailed(result.payout.id, reason);
      operationalLog("warn", "payout.submission_rejected", { payoutId: result.payout.id });
      return NextResponse.json(findPayout(result.payout.id), { status: 502 });
    }
    markSubmitted(result.payout.id, submission.hash, submission.ledger, submission.feeCharged);
    operationalLog("info", "payout.submitted", { payoutId: result.payout.id });
    return NextResponse.json(findPayout(result.payout.id));
  } catch {
    markSubmissionUnknown(result.payout.id);
    operationalLog("error", "payout.submission_unknown", { payoutId: result.payout.id });
    return NextResponse.json({ error: "Transaction submission outcome is unknown; operator review is required." }, { status: 502 });
  }
}
