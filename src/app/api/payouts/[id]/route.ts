import { NextResponse } from "next/server";
import { findPayout } from "@/server/payouts";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payout = findPayout(id);
  if (!payout) return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  return NextResponse.json(payout);
}
