import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  fetchTabValues,
  listTabTitles,
  rowsToObjects,
  findHeaderKey,
  scoreDateColumns,
  toIsoDate,
} from "../../../lib/sheetsSync.js";
import { aggregateGrowth } from "../../../lib/aggregate.js";
import { parseSchoolRoster } from "../../../lib/currentStateAggregate.js";
import { buildSchoolRegionIndex, classifyVenue } from "../../../lib/venueRegion.js";

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
async function resolveLiveDashboardTab(spreadsheetId) {
  const tabs = await listTabTitles(spreadsheetId);
  return tabs.find((t) => /dashboard|roster|live/i.test(t)) || tabs[0];
}

// Builds the school -> JHB/CPT/Football lookup from the same Live
// Dashboard roster the Current State board already parses, so both boards
// agree on which school is which region. Best-effort: returns an empty
// index (everything classifies as "unclassified") if the roster can't be
// read, rather than failing the whole sync over a region breakdown.
async function buildRegionIndex() {
  const sheetId = process.env.GOOGLE_SHEET_ID_LIVE_DASHBOARD;
  if (!sheetId) return [];
  try {
    const tab = await resolveLiveDashboardTab(sheetId);
    if (!tab) return [];
    const values = await fetchTabValues(sheetId, tab);
    const parsed = parseSchoolRoster(values);
    if (!parsed.parsed) return [];
    return buildSchoolRegionIndex(parsed.rows);
  } catch {
    return [];
  }
}

// Tallies raw venue text that couldn't be matched to a region, for
// ?debug=1 — surfaces exactly which real venues need a roster fix rather
// than leaving "unclassified" as an unexplained bucket.
function sampleUnclassifiedVenues(allRows, schoolRegionIndex) {
  const counts = new Map();
  for (const row of allRows) {
    const venue = (row.__venue || "").trim();
    if (!venue) continue;
    if (classifyVenue(venue, schoolRegionIndex) !== "unclassified") continue;
    counts.set(venue, (counts.get(venue) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
}

function findYearResponseTab(tabs, year) {
  const yearStr = String(year);
  const exclude = /copy of|old|test|backup|draft/i;
  return tabs.find(
    (t) => t.startsWith(yearStr) && /respons|reponse/i.test(t) && !exclude.test(t)
  );
}

// Every real venue value seen across these forms follows "<name> (<Day>)
// <HH:MM>-<HH:MM>" (or a close variant — day outside parens, no dashes
// around the time, etc), so a day name AND a time range appearing anywhere
// in the same cell is a strong, content-based signal for "this is the
// venue column" — needed because some tabs (e.g. Intentions 2026) have a
// blank header there too, same as their date column did.
const DAY_WORD = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*s?\b/i;
const TIME_RANGE = /\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/;

function looksLikeVenue(raw) {
  return DAY_WORD.test(raw) && TIME_RANGE.test(raw);
}

function findVenueKeyByContent(tabRows) {
  const headers = Object.keys(tabRows[0] || {});
  let best = null;
  for (const h of headers) {
    let checked = 0;
    let hits = 0;
    for (const row of tabRows.slice(0, 200)) {
      const v = row[h];
      if (!v) continue;
      checked++;
      if (looksLikeVenue(v)) hits++;
    }
    if (checked < 5) continue;
    const rate = hits / checked;
    if (rate >= 0.3 && (!best || rate > best.rate)) best = { key: h, rate };
  }
  return best ? best.key : null;
}

function findVenueKey(tabRows) {
  if (!tabRows || tabRows.length === 0) return null;
  const headers = Object.keys(tabRows[0]);
  return headers.find((h) => /school|venue/i.test(h)) || findVenueKeyByContent(tabRows);
}

// The 2025 Intentions tab's real trial-status header ("Status of Trial...")
// literally encodes its own value set ("1 - Message 01", "2 - Message 02",
// "3 - Not Enrolling", "4 - Enrolled"). The 2026 tab has no header
// containing "status" at all (same blank/"Column N" pattern already hit
// for its date and venue columns) — so this looks for a column whose
// values are drawn from that same small, distinctive vocabulary, the same
// content-based fallback approach used for venue/date detection.
const STATUS_VALUE = /enrolled|not enrolling|message\s*0?[12]/i;

function findStatusKeyByContent(tabRows) {
  const headers = Object.keys(tabRows[0] || {});
  let best = null;
  for (const h of headers) {
    let checked = 0;
    let hits = 0;
    for (const row of tabRows.slice(0, 200)) {
      const v = row[h];
      if (!v) continue;
      checked++;
      if (STATUS_VALUE.test(v)) hits++;
    }
    if (checked < 5) continue;
    const rate = hits / checked;
    if (rate >= 0.3 && (!best || rate > best.rate)) best = { key: h, rate };
  }
  return best ? best.key : null;
}

// Diagnostic only (surfaced under ?debug=1): tallies the actual raw values
// of whichever column looks like the school/venue field, so a JHB/CPT/
// Football classifier can be designed against real values instead of
// guessed at — these forms are hand-edited same as everything else in
// these workbooks, so the real option text needs to be seen directly.
function sampleVenueValues(tabRows, key) {
  if (!tabRows || tabRows.length === 0 || !key) return null;
  const counts = new Map();
  for (const row of tabRows) {
    const v = (row[key] || "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
  return { key, uniqueCount: counts.size, top };
}

// Pulls both the 2025 archive tab and the 2026 live tab and concatenates
// rows. The two tabs can have entirely different column layouts (headers
// renamed, reordered, or dropped between years on these hand-edited
// sheets), so every field aggregation needs is resolved separately for
// EACH tab, while its rows still share one consistent header set, and
// stamped onto every row (`__timestamp`, `__venue`, `__status`, `__reason`,
// `__package`) before merging. Once merged, downstream aggregation just
// reads these directly — no more guessing across a mixed bag of two
// different tabs' columns. (Resolving __status/__reason/__package here
// instead of once on the merged set fixed a real bug: trialOutcomes was
// silently missing all 2026 data because the "status" column name only
// existed on the 2025 tab's rows.)
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
    const headers = tabRows[0] ? Object.keys(tabRows[0]) : [];
    // Column A is always the submission date/timestamp on the Intentions,
    // Enrolments, and B-less sheets — confirmed directly against the real
    // sheets, month-first (M/D/YYYY), same as Google Forms' own
    // auto-generated Timestamp column always is. Read positionally rather
    // than via detectDateColumn's content-scoring heuristic: that heuristic
    // was picking a different, wrong column on at least one of these
    // sheets, silently dropping same-day rows (a real submission for
    // 9/4/2026 never made it into that day's count).
    const dateKey = headers[0] || null;
    const venueKey = findVenueKey(tabRows);
    const statusKey = findHeaderKey(headers, "status") || findStatusKeyByContent(tabRows);
    const reasonKey = findHeaderKey(headers, "reason");
    const packageKey = findHeaderKey(headers, "package");
    for (const row of tabRows) {
      row.__timestamp = dateKey ? toIsoDate(row[dateKey], false) : undefined;
      row.__venue = venueKey ? row[venueKey] : undefined;
      row.__status = statusKey ? row[statusKey] : undefined;
      row.__reason = reasonKey ? row[reasonKey] : undefined;
      row.__package = packageKey ? row[packageKey] : undefined;
    }
    rows.push(...tabRows);
    perTab.push({
      tab,
      rowCount: tabRows.length,
      allHeaders: headers,
      timestampKey: dateKey,
      dayFirst: false,
      sampleTimestamps: tabRows.slice(0, 5).map((r) => r.__timestamp),
      columnScores: scoreDateColumns(tabRows).slice(0, 6),
      venueKey,
      venueSamples: sampleVenueValues(tabRows, venueKey),
      statusKey,
      reasonKey,
      packageKey,
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

    const [intentions, enrolments, bless, schoolRegionIndex] = await Promise.all([
      fetchYearCombinedRows(sheetIds.intentions),
      fetchYearCombinedRows(sheetIds.enrolments),
      fetchYearCombinedRows(sheetIds.bless),
      buildRegionIndex(),
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
    }, schoolRegionIndex);
    aggregated.retentionCalls = retentionCalls;

    const blob = await put("growth-data.json", JSON.stringify(aggregated, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      // Vercel Blob's default cache-control (1 year, public) assumes a
      // stable URL means stable content — true for random-suffix blobs, not
      // for this one, which is overwritten in place at the same URL every
      // sync (see the allowOverwrite comment above). Without this, the CDN
      // keeps serving whatever it cached on the very first sync no matter
      // how many times the underlying object actually changes.
      cacheControlMaxAge: 0,
    });

    const debug = new URL(request.url).searchParams.get("debug");
    const response = { ok: true, url: blob.url, generatedAt: aggregated.generatedAt };
    if (debug) {
      const allRows = [...intentions.rows, ...enrolments.rows, ...bless.rows];
      response.debug = {
        intentions: { chosenTabs: intentions.chosenTabs, perTab: intentions.perTab },
        enrolments: { chosenTabs: enrolments.chosenTabs, perTab: enrolments.perTab },
        bless: { chosenTabs: bless.chosenTabs, perTab: bless.perTab },
        region: {
          schoolCount: schoolRegionIndex.length,
          regionTotals: aggregated.regionTotals,
          topUnclassifiedVenues: sampleUnclassifiedVenues(allRows, schoolRegionIndex),
        },
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
