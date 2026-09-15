import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { SCORECARD_CATEGORIES, scoreRatings } from "../../../../lib/scorecard.js";

const BLOB_KEY = "coach-scorecard-data.json";

// Same blob, same read-modify-write pattern as /api/scorecard — duplicated
// here rather than shared, matching this app's existing convention of each
// route keeping its own small blob helpers (see the sync routes).
async function readEntries() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return [];
    const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    const res = await fetch(latest.url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

// A rating cell can be a plain number (0-5) or the "N-Label" text the real
// EM Performance Tracker workbook uses ("4-Good (Above Expectations)") —
// same leading-digit convention as that workbook's own formulas
// (VALUE(LEFT(cell,1))). Anything else (blank, unrecognized text) reads as
// 0/not-rated rather than failing the whole import over one bad cell.
function parseRatingCell(raw) {
  if (raw == null) return 0;
  if (typeof raw === "number") return Math.min(5, Math.max(0, Math.round(raw)));
  const text = typeof raw === "object" && raw.text != null ? raw.text : raw;
  const match = String(text).trim().match(/^(\d)/);
  if (!match) return 0;
  const n = Number(match[1]);
  return n >= 0 && n <= 5 ? n : 0;
}

// Locates the header row by finding one whose cells contain every category
// name from SCORECARD_CATEGORIES as an exact (trimmed, case-insensitive)
// match — the same content-based approach lib/currentStateAggregate.js
// uses for the roster sheet's own header row, since an uploaded report's
// exact layout can't be assumed ahead of time. The coach-name column is
// taken to be immediately before the first category column, matching the
// real EM Performance Tracker template this feature is modeled on (its own
// name column has no header text at all, same as the roster sheet's school
// column).
function findHeader(worksheet) {
  let found = null;
  worksheet.eachRow((row) => {
    if (found) return;
    const values = row.values || [];
    const cols = {};
    for (const category of SCORECARD_CATEGORIES) {
      const idx = values.findIndex(
        (v, i) => i > 0 && String(v ?? "").trim().toLowerCase() === category.toLowerCase()
      );
      if (idx === -1) return;
      cols[category] = idx;
    }
    found = { rowNumber: row.number, cols };
  });
  return found;
}

// Reads every coach row under the header, all the way to the end of the
// sheet — NOT stopping at the first blank row, since the real workbook has
// at least one blank spacer row between the header and its first coach.
// A row counts as a coach row only when it has both a name AND at least
// one non-blank value in a category column; that second condition is what
// safely skips the "TEAM AVERAGE"/"SCORING BASIS" summary section below
// the real coach rows without needing to recognize that section's text
// specifically — its own name-like cells never have anything in the
// category columns themselves.
function parseWorkbookRows(worksheet) {
  const header = findHeader(worksheet);
  if (!header) {
    return { error: "Could not find a header row containing all 10 scorecard category names." };
  }

  const coachCol = Math.min(...Object.values(header.cols)) - 1;
  if (coachCol < 1) {
    return { error: "Could not find a coach-name column before the category columns." };
  }

  const rows = [];
  for (let r = header.rowNumber + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const name = String(row.getCell(coachCol).value ?? "").trim();
    const hasAnyValue = SCORECARD_CATEGORIES.some((c) => {
      const v = row.getCell(header.cols[c]).value;
      return v != null && String(v).trim() !== "";
    });
    if (!name || !hasAnyValue) continue;

    const ratings = {};
    for (const c of SCORECARD_CATEGORIES) {
      ratings[c] = parseRatingCell(row.getCell(header.cols[c]).value);
    }
    rows.push({ name, ratings });
  }
  return { rows };
}

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Vercel Blob not configured" }, { status: 500 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  const periodType = formData.get("periodType");
  const periodKey = formData.get("periodKey");

  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }
  if (periodType !== "weekly" && periodType !== "monthly") {
    return NextResponse.json(
      { ok: false, error: "periodType must be 'weekly' or 'monthly'" },
      { status: 400 }
    );
  }
  if (!periodKey || typeof periodKey !== "string") {
    return NextResponse.json({ ok: false, error: "Missing periodKey" }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name || "")) {
    return NextResponse.json({ ok: false, error: "Only .xlsx files are supported" }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await workbook.xlsx.load(buffer);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read this file as an .xlsx workbook" },
      { status: 400 }
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return NextResponse.json({ ok: false, error: "The workbook has no sheets" }, { status: 400 });
  }

  const parsed = parseWorkbookRows(worksheet);
  if (parsed.error) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No coach rows found under the header row" },
      { status: 400 }
    );
  }

  const existing = await readEntries();
  const updated = [];
  let nextEntries = existing;
  for (const { name, ratings } of parsed.rows) {
    const id = `${periodType}:${periodKey}:${name}`;
    const entry = {
      id,
      coach: name,
      periodType,
      periodKey,
      ratings,
      ...scoreRatings(ratings),
      updatedAt: new Date().toISOString(),
    };
    nextEntries = [...nextEntries.filter((e) => e.id !== id), entry];
    updated.push(entry);
  }

  await put(BLOB_KEY, JSON.stringify({ entries: nextEntries }, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });

  return NextResponse.json({ ok: true, updated });
}
