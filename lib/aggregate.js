import { findHeaderKey } from "./sheetsSync.js";

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

function tallyByKeyword(rows, keyword, { multiSelect = false } = {}) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const col = findHeaderKey(headers, keyword);
  if (!col) return [];

  const counts = new Map();
  for (const row of rows) {
    const raw = (row[col] || "").trim();
    if (!raw) continue;
    const values = multiSelect ? raw.split(",").map((v) => v.trim()) : [raw];
    for (const v of values) {
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function buildMonthlySeries(monthWindows, datasets, now) {
  return monthWindows.map(({ key, label, year, month }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
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

// datasets: { intentions: [...rowObjects], enrolments: [...], bless: [...] }
export function aggregateGrowth(datasets, { now = new Date() } = {}) {
  const monthWindows = buildWindowMonths();

  const dateSets = {
    intentions: datesOf(datasets.intentions || []),
    enrolments: datesOf(datasets.enrolments || []),
    bless: datesOf(datasets.bless || []),
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
    trialOutcomes: tallyByKeyword(datasets.intentions || [], "status"),
    blessReasons: tallyByKeyword(datasets.bless || [], "reason", { multiSelect: true }),
    compare: {
      monthVsMonth: comparePeriods(months, metricNames),
      weekVsWeek: comparePeriods(weekly, metricNames),
      // Year-over-year is intentionally not computed — only one season of
      // history exists. Revisit once a second season's data exists.
      yearOverYear: null,
    },
  };
}
