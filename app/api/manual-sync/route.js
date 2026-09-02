import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lets the dashboard's "Sync now" button run both sync jobs on demand, the
// same jobs the hourly cron calls, without ever exposing CRON_SECRET to the
// browser: this route runs server-side, so it reads the secret from its own
// environment and attaches it itself when it calls the existing sync routes
// internally. This reuses those routes' logic as-is rather than duplicating
// it here.
async function callSyncRoute(baseUrl, path, secret) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({ error: "Invalid JSON response" }));
  return { ok: res.ok && body.ok === true, status: res.status, ...body };
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const baseUrl = new URL(request.url).origin;
  const [growth, currentState] = await Promise.all([
    callSyncRoute(baseUrl, "/api/sync-growth", secret),
    callSyncRoute(baseUrl, "/api/sync-current-state", secret),
  ]);

  const ok = growth.ok && currentState.ok;
  return NextResponse.json({ ok, growth, currentState }, { status: ok ? 200 : 502 });
}
