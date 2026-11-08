import { NextResponse } from "next/server";
import { readinessStatus } from "@/server/operations";

export const dynamic = "force-dynamic";

export function GET() {
  const status = readinessStatus();
  return NextResponse.json(
    { status: status.ready ? "ready" : "not_ready", settlement: status.settlement },
    { status: status.ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
