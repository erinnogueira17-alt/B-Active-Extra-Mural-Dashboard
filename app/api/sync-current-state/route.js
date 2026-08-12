import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { fetchTabValues, listTabTitles } from "../../../lib/sheetsSync.js";
import { parseSchoolRoster, aggregateCurrentState } from "../../../lib/currentStateAggregate.js";

export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

async function resolveLiveDashboardTab(spreadsheetId) {
  const tabs = await listTabTitles(spreadsheetId);
  return tabs.find((t) => /dashboard|roster|live/i.test(t)) || tabs[0];
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sheetId = process.env.GOOGLE_SHEET_ID_LIVE_DASHBOARD;
    if (!sheetId) throw new Error("Missing env var GOOGLE_SHEET_ID_LIVE_DASHBOARD");

    const tab = await resolveLiveDashboardTab(sheetId);
    if (!tab) throw new Error("Live Dashboard sheet has no tabs");

    const values = await fetchTabValues(sheetId, tab);
    const parseResult = parseSchoolRoster(values);
    const aggregated = aggregateCurrentState(parseResult);

    const blob = await put("current-state-data.json", JSON.stringify(aggregated, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    return NextResponse.json({ ok: true, url: blob.url, generatedAt: aggregated.generatedAt });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
