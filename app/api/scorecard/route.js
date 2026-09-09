import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SCORECARD_CATEGORIES, scoreRatings } from "../../../lib/scorecard.js";

const BLOB_KEY = "coach-scorecard-data.json";

// The only user-written (not synced-from-Sheets) data in this app, so it
// gets its own small read-modify-write blob rather than reusing the sync
// routes' pattern — same overwrite-in-place / cacheControlMaxAge:0 approach
// as current-state-history.json, for the same reason (a stable URL that
// really does change on every write needs the CDN to revalidate every time).
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

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Vercel Blob not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { coach, periodType, periodKey, ratings } = body || {};
  if (!coach || typeof coach !== "string" || !coach.trim()) {
    return NextResponse.json({ ok: false, error: "Missing coach" }, { status: 400 });
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
  if (!ratings || typeof ratings !== "object") {
    return NextResponse.json({ ok: false, error: "Missing ratings" }, { status: 400 });
  }

  const cleanRatings = {};
  for (const category of SCORECARD_CATEGORIES) {
    const v = Number(ratings[category]);
    cleanRatings[category] = Number.isFinite(v) && v >= 0 && v <= 5 ? Math.round(v) : 0;
  }

  const coachName = coach.trim();
  const id = `${periodType}:${periodKey}:${coachName}`;
  const entry = {
    id,
    coach: coachName,
    periodType,
    periodKey,
    ratings: cleanRatings,
    ...scoreRatings(cleanRatings),
    updatedAt: new Date().toISOString(),
  };

  const entries = await readEntries();
  const nextEntries = [...entries.filter((e) => e.id !== id), entry];

  await put(BLOB_KEY, JSON.stringify({ entries: nextEntries }, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });

  return NextResponse.json({ ok: true, entry });
}
