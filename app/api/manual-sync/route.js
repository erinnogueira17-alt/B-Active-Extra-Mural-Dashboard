import { NextResponse } from "next/server";
import { GET as syncGrowth } from "../sync-growth/route.js";
import { GET as syncCurrentState } from "../sync-current-state/route.js";

export const dynamic = "force-dynamic";

// Lets the dashboard's "Sync now" button run both sync jobs on demand, the
// same jobs the hourly cron calls, without ever exposing CRON_SECRET to the
// browser: this route runs server-side, so it reads the secret from its own
// environment and attaches it itself when it calls the existing sync
// handlers. This reuses those handlers' logic as-is rather than duplicating
// it here.
//
// The handlers are called in-process rather than fetched over HTTP. A fetch
// to the deployment's own public URL goes through Vercel's deployment
// protection (SSO on *.vercel.app), which answers with a login page instead
// of JSON, so the sync looked like it had returned "Invalid JSON response".
async function callSyncRoute(handler, baseUrl, path, secret) {
  const req = new Request(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const res = await handler(req);
  const body = await res.json().catch(() => ({ error: `Sync returned a non-JSON response (HTTP ${res.status})` }));
  return { ok: res.ok && body.ok === true, status: res.status, ...body };
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const baseUrl = new URL(request.url).origin;
  const [growth, currentState] = await Promise.all([
    callSyncRoute(syncGrowth, baseUrl, "/api/sync-growth", secret),
    callSyncRoute(syncCurrentState, baseUrl, "/api/sync-current-state", secret),
  ]);

  const ok = growth.ok && currentState.ok;
  return NextResponse.json({ ok, growth, currentState }, { status: ok ? 200 : 502 });
}
