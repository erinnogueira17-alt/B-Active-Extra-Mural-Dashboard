import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Read-only-ish diagnostic: surfaces exactly which column each Intentions/
// Enrolments/B-less tab is using as its date column, plus sample parsed
// timestamps and column-scoring, by calling the existing sync-growth
// debug output server-side (attaching CRON_SECRET itself, so the secret
// never has to leave the server or reach the browser). No auth required
// to call this route itself, matching manual-sync's trust model — this is
// an internal ops tool with no other protection layer in front of it.
// Note this still runs a real sync underneath (same as any ?debug=1 call
// to sync-growth), so it also refreshes growth-data.json as a side effect.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const baseUrl = new URL(request.url).origin;
  const res = await fetch(`${baseUrl}/api/sync-growth?debug=1`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({ error: "Invalid JSON response" }));
  return NextResponse.json(body, { status: res.status });
}
