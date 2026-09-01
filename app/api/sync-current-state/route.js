import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { fetchTabValues, listTabTitles } from "../../../lib/sheetsSync.js";
import { parseSchoolRoster, aggregateCurrentState } from "../../../lib/currentStateAggregate.js";

const HISTORY_BLOB_KEY = "current-state-history.json";
// The sync now runs hourly, but history still keeps just one entry per
// calendar day — appendHistorySnapshot below replaces "today"'s entry each
// time rather than appending a new one, so a day's entry simply gets
// refreshed with more current numbers through the day instead of the
// history array growing 24x. This bounds the blob's size rather than
// letting it grow forever.
const MAX_HISTORY_ENTRIES = 800;

// Deliberately NOT shifted to SAST. For 22 of the 24 hourly runs, a plain
// UTC calendar-date slice of `generatedAt` already agrees with the true
// SAST date (SAST is only +2h ahead, so the two only disagree during
// 22:00-23:59 UTC, which is 00:00-01:59 SAST the *next* day). During that
// one 2-hour window, this labels the snapshot with the SAST day that just
// ended rather than the few-hours-old new day — matching the original
// nightly-cron design (which fired at exactly 22:00 UTC = 00:00 SAST, on
// purpose, to capture a just-completed SAST day). Converting to true SAST
// wall-clock here would flip that window's label forward by a day instead.
function snapshotFrom(aggregated) {
  const date = aggregated.generatedAt.slice(0, 10);
  return {
    date,
    totals: { ...aggregated.totals },
    sections: Object.fromEntries(
      Object.entries(aggregated.sections || {}).map(([key, s]) => [
        key,
        {
          payingPlayers: s.payingPlayers,
          sponsoredPlayers: s.sponsoredPlayers,
          enrolledPlayers: s.enrolledPlayers,
          revenue: s.revenue,
          schools: s.schools,
        },
      ])
    ),
  };
}

// Reads the existing history array (best-effort — an empty/missing/corrupt
// blob just means history starts fresh from today), appends today's real
// snapshot (replacing any existing entry for today, so re-running the sync
// twice in one day doesn't create a duplicate point), and writes it back.
// This is what lets "every month going back" on the Current State board
// show real data over time instead of fabricating history that was never
// actually captured before now.
async function appendHistorySnapshot(aggregated) {
  let history = [];
  try {
    const { blobs } = await list({ prefix: HISTORY_BLOB_KEY });
    if (blobs.length > 0) {
      const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const res = await fetch(latest.url, { cache: "no-store" });
      if (res.ok) {
        const parsed = await res.json();
        if (Array.isArray(parsed)) history = parsed;
      }
    }
  } catch {
    // Corrupt or unreadable history blob — start fresh rather than fail the sync.
  }

  const entry = snapshotFrom(aggregated);
  const withoutToday = history.filter((h) => h && h.date !== entry.date);
  const updated = [...withoutToday, entry]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-MAX_HISTORY_ENTRIES);

  await put(HISTORY_BLOB_KEY, JSON.stringify(updated, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return updated;
}

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

    const history = aggregated.parsed ? await appendHistorySnapshot(aggregated) : null;

    return NextResponse.json({
      ok: true,
      url: blob.url,
      generatedAt: aggregated.generatedAt,
      historyEntries: history ? history.length : 0,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
