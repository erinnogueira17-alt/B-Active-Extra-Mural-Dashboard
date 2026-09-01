import { classifyVenue } from "./venueRegion.js";

// South Africa Standard Time is a fixed UTC+2 year-round (no DST) — used
// only where a real server clock instant (`now`) needs to be compared
// against SAST calendar boundaries. Every parsed submission timestamp
// already stores the sheet's own SAST wall-clock numbers *as if* they were
// UTC (see lib/sheetsSync.js) purely as a bucketing trick, and every
// day/month key in this file reads them back the same way — that part
// needs no SAST adjustment, since both sides of every comparison already
// agree. The one place a *real* clock (`new Date()`) enters the picture is
// deciding whether a season month has started yet, below.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// Season window is hardcoded per project decision: Nov 2025 - Nov 2026 (13
// months). Extending into a second season requires updating this function.
export function buildWindowMonths() {
  const months = [];
  let year = 2025;
  let month = 10; // November, 0-based
  for (let i = 0; i < 13; i++) {
    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      year,
      month, // 0-based
    });
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  return months;
}

function parseTimestamp(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function dateKeyOf(date) {
  return date.toISOString().slice(0, 10);
}

function monthKeyOf(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ISO-style week starting Monday, keyed by that Monday's date.
function weekStartOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

function weekLabelOf(weekStart) {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d) => d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

// The sync route resolves each source tab's real date column (by content,
// since header text drifts across these hand-edited sheets) and stamps it
// onto every row as `__timestamp` *before* rows from different tabs (which
// can have entirely different column layouts) get merged together — doing
// it any later can't tell which tab a row came from anymore. So by the time
// rows reach here, the timestamp is already resolved; just read it.
function datesOf(rows) {
  return rows.map((r) => parseTimestamp(r.__timestamp)).filter(Boolean);
}

// Tallies a field the sync route already resolved per-tab before merging
// (__status, __reason, __package, __venue) — never re-derives a header
// name from rows[0], since the 2025/2026 tabs being merged can have
// entirely different header sets and rows[0] would only ever reflect
// whichever tab happened to be concatenated first.
function tallyField(rows, field, { multiSelect = false, limit } = {}) {
  const counts = new Map();
  for (const row of rows || []) {
    const raw = (row[field] || "").trim();
    if (!raw) continue;
    const values = multiSelect ? raw.split(",").map((v) => v.trim()) : [raw];
    for (const v of values) {
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  return limit ? sorted.slice(0, limit) : sorted;
}

function buildMonthlySeries(monthWindows, datasets, now) {
  return monthWindows.map(({ key, label, year, month }) => {
    // `now` is a real clock instant (true UTC). Date.UTC(year, month, 1)
    // labels "the 1st at 00:00" but — per the SAST-as-pseudo-UTC scheme
    // this file uses everywhere else — that label means 00:00 SAST, whose
    // true UTC instant is 2 hours earlier (22:00 UTC the day before).
    // Without this shift, a month that has genuinely already started in
    // SAST could show as "not started yet" for up to 2 hours after
    // midnight SAST on the 1st.
    const monthStart = new Date(Date.UTC(year, month, 1) - SAST_OFFSET_MS);
    const isFuture = monthStart > now;
    const entry = { key, label };
    for (const [name, dates] of Object.entries(datasets)) {
      entry[name] = isFuture ? null : dates.filter((d) => monthKeyOf(d) === key).length;
    }
    return entry;
  });
}

function buildDailySeries(datasets) {
  const keys = new Set();
  for (const dates of Object.values(datasets)) {
    for (const d of dates) keys.add(dateKeyOf(d));
  }
  return [...keys]
    .sort()
    .map((key) => {
      const entry = { key, label: key };
      for (const [name, dates] of Object.entries(datasets)) {
        entry[name] = dates.filter((d) => dateKeyOf(d) === key).length;
      }
      return entry;
    });
}

function buildWeeklySeries(datasets) {
  const keys = new Map(); // weekKey -> weekStart Date
  for (const dates of Object.values(datasets)) {
    for (const d of dates) {
      const ws = weekStartOf(d);
      keys.set(dateKeyOf(ws), ws);
    }
  }
  return [...keys.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, weekStart]) => {
      const entry = { key, label: weekLabelOf(weekStart) };
      for (const [name, dates] of Object.entries(datasets)) {
        entry[name] = dates.filter((d) => dateKeyOf(weekStartOf(d)) === key).length;
      }
      return entry;
    });
}

function comparePeriods(series, metricNames) {
  const withData = series.filter((s) => metricNames.some((m) => s[m] != null));
  if (withData.length < 2) return null;
  const [previous, current] = withData.slice(-2);
  const deltas = {};
  for (const m of metricNames) {
    const prev = previous[m] ?? 0;
    const curr = current[m] ?? 0;
    deltas[m] = {
      delta: curr - prev,
      pct: prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10,
    };
  }
  return { previous, current, deltas };
}

// B-Active tracks Johannesburg extramural and Cape Town extramural as the
// two departments this dashboard covers. Football/Soccer is a separate
// department the business explicitly does not want in this dashboard at
// all (see the football-exclusion filter in aggregateGrowth below) — so
// this only ever needs to split jhb/cpt/unclassified, over the same
// season window as the headline "Season totals" figure (so the split sums
// back to it), by classifying each row's venue against the Current State
// roster via classifyVenue. schoolRegionIndex is built once per sync from
// that roster (see lib/venueRegion.js) and passed in rather than rebuilt
// here. `datasets` here is already football-filtered by the caller, but
// the `!totals[region]` guard stays defensive in case classifyVenue ever
// returns something this shape doesn't expect, rather than throwing.
function regionTotalsOf(datasets, schoolRegionIndex, monthWindows) {
  const windowKeys = new Set(monthWindows.map((m) => m.key));
  const totals = {
    jhb: { intentions: 0, enrolments: 0, bless: 0 },
    cpt: { intentions: 0, enrolments: 0, bless: 0 },
    unclassified: { intentions: 0, enrolments: 0, bless: 0 },
  };
  for (const metric of ["intentions", "enrolments", "bless"]) {
    for (const row of datasets[metric] || []) {
      const date = parseTimestamp(row.__timestamp);
      if (!date || !windowKeys.has(monthKeyOf(date))) continue;
      const region = classifyVenue(row.__venue, schoolRegionIndex);
      if (!totals[region]) continue;
      totals[region][metric] += 1;
    }
  }
  return totals;
}

// The business only wants Johannesburg/Cape Town extramural in this
// dashboard — "do not include football, do not include soccer" — even
// though Football/Soccer rides along in the same three intake forms.
// classifyVenue is still the right tool to identify those rows (it
// already knows the real Action Arena venues and the roster's own Soccer
// section, and correctly keeps a JHB school's own "(Boys) SOCCER" activity
// out of that bucket) — it's just that here the result is used to
// *exclude* rows up front rather than to bucket them for display.
function excludeFootball(rows, schoolRegionIndex) {
  return (rows || []).filter((r) => classifyVenue(r.__venue, schoolRegionIndex) !== "football");
}

// datasets: { intentions: [...rowObjects], enrolments: [...], bless: [...] }
export function aggregateGrowth(datasets, schoolRegionIndex, { now = new Date() } = {}) {
  const monthWindows = buildWindowMonths();

  // Filter football out once, up front, so every aggregate below (month/
  // daily/weekly series, region split, trial outcomes, package mix, top
  // venues) is automatically football-free rather than each one needing
  // its own exclusion logic.
  const filteredDatasets = {
    intentions: excludeFootball(datasets.intentions, schoolRegionIndex),
    enrolments: excludeFootball(datasets.enrolments, schoolRegionIndex),
    bless: excludeFootball(datasets.bless, schoolRegionIndex),
  };

  const dateSets = {
    intentions: datesOf(filteredDatasets.intentions),
    enrolments: datesOf(filteredDatasets.enrolments),
    bless: datesOf(filteredDatasets.bless),
  };

  const months = buildMonthlySeries(monthWindows, dateSets, now);
  const daily = buildDailySeries(dateSets);
  const weekly = buildWeeklySeries(dateSets);

  const metricNames = ["intentions", "enrolments", "bless"];

  return {
    generatedAt: now.toISOString(),
    seasonStart: `${monthWindows[0].year}-${String(monthWindows[0].month + 1).padStart(2, "0")}-01`,
    seasonEnd: `${monthWindows[monthWindows.length - 1].year}-${String(
      monthWindows[monthWindows.length - 1].month + 1
    ).padStart(2, "0")}-01`,
    months,
    daily,
    weekly,
    regionTotals: regionTotalsOf(filteredDatasets, schoolRegionIndex, monthWindows),
    trialOutcomes: tallyField(filteredDatasets.intentions, "__status"),
    packageMix: tallyField(filteredDatasets.enrolments, "__package"),
    topVenues: {
      intentions: tallyField(filteredDatasets.intentions, "__venue", { limit: 10 }),
      enrolments: tallyField(filteredDatasets.enrolments, "__venue", { limit: 10 }),
      bless: tallyField(filteredDatasets.bless, "__venue", { limit: 10 }),
    },
    compare: {
      monthVsMonth: comparePeriods(months, metricNames),
      weekVsWeek: comparePeriods(weekly, metricNames),
      // Year-over-year is intentionally not computed — only one season of
      // history exists. Revisit once a second season's data exists.
      yearOverYear: null,
    },
  };
}
