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

// Pulls both the 2025 archive tab and the 2026 live tab (matched by title,
// since exact tab names aren't known ahead of time) and concatenates rows.
async function fetchYearCombinedRows(spreadsheetId) {
  const tabs = await listTabTitles(spreadsheetId);
  const tab2025 = tabs.find((t) => /2025/.test(t));
  const tab2026 = tabs.find((t) => /2026/.test(t));
  const chosenTabs = [tab2025, tab2026].filter(Boolean);
  const targets = chosenTabs.length > 0 ? chosenTabs : tabs.slice(0, 1);

  const rows = [];
  for (const tab of targets) {
    const values = await fetchTabValues(spreadsheetId, tab);
    rows.push(...rowsToObjects(values));
  }
  return { rows, allTabs: tabs, chosenTabs: targets };
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
        intentions: {
          allTabs: intentions.allTabs,
          chosenTabs: intentions.chosenTabs,
          rowCount: intentions.rows.length,
          sampleHeaders: intentions.rows[0] ? Object.keys(intentions.rows[0]) : [],
        },
        enrolments: {
          allTabs: enrolments.allTabs,
          chosenTabs: enrolments.chosenTabs,
          rowCount: enrolments.rows.length,
          sampleHeaders: enrolments.rows[0] ? Object.keys(enrolments.rows[0]) : [],
        },
        bless: {
          allTabs: bless.allTabs,
          chosenTabs: bless.chosenTabs,
          rowCount: bless.rows.length,
          sampleHeaders: bless.rows[0] ? Object.keys(bless.rows[0]) : [],
        },
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
