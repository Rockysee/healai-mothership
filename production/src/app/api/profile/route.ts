/**
 * POST /api/profile?user_id=xxx
 * Saves profile snapshot server-side.
 * MVP: logs + returns 200 (extend with DB later).
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id") || "anonymous";
    const body = await req.json();

    // TODO: persist to DB keyed by user_id
    console.log("[profile:save]", user_id, JSON.stringify(body).slice(0, 200));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
