import { getAccessToken } from "./googleAuth.js";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

// Fetches one tab's values as an array of rows (arrays of cell strings).
// `range` is a Sheets A1 range, typically just a tab/sheet name to grab the
// whole tab, e.g. "Form Responses 1" or "2026".
export async function fetchTabValues(spreadsheetId, range) {
  const token = await getAccessToken();
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?majorDimension=ROWS`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Sheets API error fetching "${range}" from ${spreadsheetId} (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  return data.values || [];
}

// Lists tab (sheet) titles for a spreadsheet, useful when a tab's exact name
// isn't known ahead of time (e.g. the live year's response tab).
export async function listTabTitles(spreadsheetId) {
  const token = await getAccessToken();
  const url = `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Sheets API error listing tabs for ${spreadsheetId} (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  return (data.sheets || []).map((s) => s.properties.title);
}

// Converts a raw values grid (first row = headers) into an array of objects
// keyed by header text, trimmed and case-preserved. Ragged rows are padded.
// A blank header cell does NOT mean an unused column — these sheets have
// live, actively-submitted-to tabs where most header cells are simply
// empty despite real per-response data sitting underneath (that data was
// previously silently dropped here). Falls back to a positional
// "Column N" name, matching the fallback convention some of these
// workbooks already use by hand for their own unlabeled columns.
export function rowsToObjects(values) {
  if (!values || values.length === 0) return [];
  const [headerRow, ...rows] = values;
  const headers = headerRow.map((h, i) => (h || "").trim() || `Column ${i + 1}`);
  return rows
    .filter((row) => row.some((cell) => (cell || "").trim() !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (row[i] ?? "").trim();
      });
      return obj;
    });
}

// Finds the header key that best matches a keyword (case-insensitive
// substring match), since exact header text on the live sheets isn't known
// ahead of time. Returns null if nothing matches.
export function findHeaderKey(headers, keyword) {
  const needle = keyword.toLowerCase();
  return headers.find((h) => h.toLowerCase().includes(needle)) || null;
}

// Parses a slash-separated date ("D/M/YYYY" or "M/D/YYYY", zero-padded or
// not, with an optional time part) given which position is the day.
// Returns a Date or null.
function parseSlashDate(raw, dayFirst) {
  const m = String(raw || "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  let [, a, b, year, hh, mm, ss] = m;
  a = parseInt(a, 10);
  b = parseInt(b, 10);
  year = parseInt(year, 10);
  if (year < 100) year += 2000;
  const day = dayFirst ? a : b;
  const month = dayFirst ? b : a;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day, hh ? +hh : 0, mm ? +mm : 0, ss ? +ss : 0));
  return isNaN(d.getTime()) ? null : d;
}

// These sheets mix date conventions: Google Forms' own auto-generated
// Timestamp column is genuinely month-first (M/D/YYYY, unpadded — e.g.
// "1/13/2025 8:42:40", where 13 can only be a day, proving month-first).
// Other tabs' date data is genuinely day-first (DD/MM/YYYY, zero-padded —
// the South African convention). A bare `new Date(string)` always assumes
// month-first, which for day-first data silently computes the WRONG date
// whenever the day is <=12 (month and day swapped) and drops the value
// entirely whenever the day is >12 (an "invalid month"). Individual values
// like "09/01/2025" can't be disambiguated on their own — but scanning
// enough values from the SAME column, some day-first column will contain a
// value whose first position exceeds 12 (impossible as a month), and
// vice versa for month-first columns. Falls back to month-first (matching
// bare `new Date()`, and Google Forms' own default) if the sample never
// disambiguates.
function detectDayFirst(rawValues) {
  for (const raw of rawValues) {
    const m = String(raw || "")
      .trim()
      .match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}/);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a > 12) return true;
    if (b > 12) return false;
  }
  return false;
}

// Parses one value using the day/month order already resolved for its
// column, falling back to native Date parsing for anything not in
// D/M-slash form (e.g. ISO-ish strings).
function parseWithDayFirst(raw, dayFirst) {
  if (!raw) return null;
  const slash = parseSlashDate(raw, dayFirst);
  if (slash) return slash;
  const native = new Date(raw);
  return isNaN(native.getTime()) ? null : native;
}

// Scores every column in a set of row-objects by what fraction of sampled
// values parse as a plausible date (year 2015-2035), sorted best-first,
// resolving each column's own day/month order first (see detectDayFirst).
// Also tracks `timeFraction`: of the values that parsed, what fraction carry
// a real (non-midnight) time-of-day component. A genuine auto-generated form
// submission Timestamp always has a real time; a hand-picked business date
// field (a due date, a start date, a termination date) is entered as a bare
// date and parses to exactly midnight. Both kinds of column can score
// similarly high on plain date-validity, so this is needed to tell them
// apart. Exposed separately from detectDateColumn so callers can inspect
// *why* a column was (or wasn't) picked, e.g. for diagnostics.
export function scoreDateColumns(rows, { sampleSize = 200 } = {}) {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});
  const sample = rows.slice(0, sampleSize);

  return headers
    .map((key) => {
      const rawValues = sample.map((row) => row[key]).filter(Boolean);
      const dayFirst = detectDayFirst(rawValues);
      let valid = 0;
      let withTime = 0;
      for (const raw of rawValues) {
        const d = parseWithDayFirst(raw, dayFirst);
        if (d && d.getUTCFullYear() > 2015 && d.getUTCFullYear() < 2035) {
          valid++;
          if (d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds()) withTime++;
        }
      }
      const checked = rawValues.length;
      return {
        key,
        checked,
        valid,
        score: checked ? valid / checked : 0,
        dayFirst,
        timeFraction: valid ? withTime / valid : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Detects which column in a set of row-objects actually holds parseable
// submission dates, by content rather than header name, and the day/month
// order to use when parsing it. These sheets are heavily hand-edited across
// years — a tab's real "Timestamp" header can be renamed, blank, or the
// date column can have moved — even though the data itself is still there.
// Call this per-tab (its rows share one consistent header set) before rows
// from different tabs get merged together. Returns { key, dayFirst } or
// null.
//
// Among columns that clear the validity bar, an exact "Timestamp" header
// wins outright (that's always the real submission time on tabs that still
// have it). Otherwise a business date field (e.g. "Date of Termination",
// "Start Date of membership") can out-score the real, blank/renamed
// timestamp column on pure date-validity alone, since both are full of
// valid dates — so prefer whichever candidate actually carries real
// time-of-day values over one that's suspiciously all-midnight.
export function detectDateColumn(rows, { sampleSize = 200 } = {}) {
  if (!rows || rows.length === 0) return null;
  const candidates = scoreDateColumns(rows, { sampleSize }).filter(
    (c) => c.checked >= 5 && c.score >= 0.6
  );
  if (candidates.length > 0) {
    const exactTimestamp = candidates.find((c) => c.key.trim().toLowerCase() === "timestamp");
    const best =
      exactTimestamp ||
      candidates.slice().sort((a, b) => b.timeFraction - a.timeFraction || b.score - a.score)[0];
    return { key: best.key, dayFirst: best.dayFirst };
  }

  const headers = Object.keys(rows[0] || {});
  const key = findHeaderKey(headers, "timestamp") || headers[0] || null;
  if (!key) return null;
  const dayFirst = detectDayFirst(rows.slice(0, sampleSize).map((r) => r[key]).filter(Boolean));
  return { key, dayFirst };
}

// Parses a raw timestamp-ish value into an ISO string using an already-
// resolved day/month order, for stamping onto rows. Exported so callers
// (the sync routes) can normalize a column's values to something
// unambiguous once they know its day/month order, rather than re-guessing
// per value later.
export function toIsoDate(raw, dayFirst) {
  const d = parseWithDayFirst(raw, dayFirst);
  return d ? d.toISOString() : undefined;
}
