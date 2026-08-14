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

// Scores every column in a set of row-objects by what fraction of sampled
// values parse as a plausible date (year 2015-2035), sorted best-first.
// Exposed separately from detectDateKey so callers can inspect *why* a
// column was (or wasn't) picked, e.g. for diagnostics.
export function scoreDateColumns(rows, { sampleSize = 200 } = {}) {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});
  const sample = rows.slice(0, sampleSize);

  return headers
    .map((key) => {
      let checked = 0;
      let valid = 0;
      for (const row of sample) {
        const raw = row[key];
        if (!raw) continue;
        checked++;
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getUTCFullYear() > 2015 && d.getUTCFullYear() < 2035) valid++;
      }
      return { key, checked, valid, score: checked ? valid / checked : 0 };
    })
    .sort((a, b) => b.score - a.score);
}

// Detects which column in a set of row-objects actually holds parseable
// submission dates, by content rather than header name. These sheets are
// heavily hand-edited across years — a tab's real "Timestamp" header can be
// renamed, blank, or the date column can have moved — even though the data
// itself is still there. Call this per-tab (its rows share one consistent
// header set) before rows from different tabs get merged together.
export function detectDateKey(rows, { sampleSize = 200 } = {}) {
  if (!rows || rows.length === 0) return null;
  const scored = scoreDateColumns(rows, { sampleSize });
  const best = scored.find((c) => c.checked >= 5);

  if (best && best.score >= 0.6) return best.key;

  const headers = Object.keys(rows[0] || {});
  return findHeaderKey(headers, "timestamp") || headers[0] || null;
}
