import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { fetchTabValues, listTabTitles, rowsToObjects } from "../../../lib/sheetsSync.js";
import { aggregateGrowth } from "../../../lib/aggregate.js";

export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

// These sheets each have dozens of tabs (scratch work, backups, promo
// trackers, "Copy of ..." duplicates) accumulated over years of manual
// editing. Plenty of unrelated tabs happen to contain "2025"/"2026"
// somewhere in their name (e.g. "Limited Edtion Dec to Feb 2025/2026",
// "School Breakdown (Keep in front)2026"), so matching on the year alone
// silently grabs the wrong tab. The real Google Forms response tabs all
// start with the year and contain "Respons(es)" — or, in this workbook,
// the consistent typo "reponse" — so require both, and exclude obvious
// non-live copies.
function findYearResponseTab(tabs, year) {
  const yearStr = String(year);
  const exclude = /copy of|old|test|backup|draft/i;
  return tabs.find(
    (t) => t.startsWith(yearStr) && /respons|reponse/i.test(t) && !exclude.test(t)
  );
}

// Pulls both the 2025 archive tab and the 2026 live tab and concatenates rows.
async function fetchYearCombinedRows(spreadsheetId) {
  const tabs = await listTabTitles(spreadsheetId);
  const tab2025 = findYearResponseTab(tabs, 2025);
  const tab2026 = findYearResponseTab(tabs, 2026);
  const chosenTabs = [tab2025, tab2026].filter(Boolean);
  const targets = chosenTabs.length > 0 ? chosenTabs : tabs.slice(0, 1);

  const rows = [];
  const perTab = [];
  for (const tab of targets) {
    const values = await fetchTabValues(spreadsheetId, tab);
    const tabRows = rowsToObjects(values);
    rows.push(...tabRows);
    const headers = tabRows[0] ? Object.keys(tabRows[0]) : [];
    const timestampKey = headers.find((h) => h.toLowerCase().includes("timestamp")) || headers[0];
    perTab.push({
      tab,
      rowCount: tabRows.length,
      timestampKey,
      sampleTimestamps: tabRows.slice(0, 3).map((r) => r[timestampKey]),
    });
  }
  return { rows, allTabs: tabs, chosenTabs: targets, perTab };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sheetIds = {
      intentions: process.env.GOOGLE_SHEET_ID_INTENTIONS,
      enrolments: process.env.GOOGLE_SHEET_ID_ENROLMENTS,
      bless: process.env.GOOGLE_SHEET_ID_BLESS,
    };
    for (const [name, id] of Object.entries(sheetIds)) {
      if (!id) throw new Error(`Missing env var for the ${name} sheet ID`);
    }

    const [intentions, enrolments, bless] = await Promise.all([
      fetchYearCombinedRows(sheetIds.intentions),
      fetchYearCombinedRows(sheetIds.enrolments),
      fetchYearCombinedRows(sheetIds.bless),
    ]);

    let retentionCalls = [];
    try {
      const tabs = await listTabTitles(sheetIds.bless);
      const retentionTab = tabs.find((t) => t.toLowerCase().includes("retention"));
      if (retentionTab) {
        const values = await fetchTabValues(sheetIds.bless, retentionTab);
        retentionCalls = rowsToObjects(values);
      }
    } catch {
      // "Retention Calls Bee" tab is optional context; ignore if absent/unreadable.
    }

    const aggregated = aggregateGrowth({
      intentions: intentions.rows,
      enrolments: enrolments.rows,
      bless: bless.rows,
    });
    aggregated.retentionCalls = retentionCalls;

    const blob = await put("growth-data.json", JSON.stringify(aggregated, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    const debug = new URL(request.url).searchParams.get("debug");
    const response = { ok: true, url: blob.url, generatedAt: aggregated.generatedAt };
    if (debug) {
      response.debug = {
        intentions: { chosenTabs: intentions.chosenTabs, perTab: intentions.perTab },
        enrolments: { chosenTabs: enrolments.chosenTabs, perTab: enrolments.perTab },
        bless: { chosenTabs: bless.chosenTabs, perTab: bless.perTab },
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
