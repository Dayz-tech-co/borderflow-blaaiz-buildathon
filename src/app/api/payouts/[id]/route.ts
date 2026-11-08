import { NextResponse } from "next/server";
import { findPayout } from "@/server/payouts";
import { isAdminAuthorized, SecurityConfigurationError } from "@/server/security";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdminAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SecurityConfigurationError ? "Payout administration is unavailable." : "Unauthorized." }, { status: error instanceof SecurityConfigurationError ? 503 : 401 });
  }
  const { id } = await context.params;
  const payout = findPayout(id);
  if (!payout) return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  return NextResponse.json(payout);
}
