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
export function rowsToObjects(values) {
  if (!values || values.length === 0) return [];
  const [headerRow, ...rows] = values;
  const headers = headerRow.map((h) => (h || "").trim());
  return rows
    .filter((row) => row.some((cell) => (cell || "").trim() !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = (row[i] ?? "").trim();
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
