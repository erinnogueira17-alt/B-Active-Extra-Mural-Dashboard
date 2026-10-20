import { NextResponse } from "next/server";
import { canonicalizeCoachName } from "../../../../lib/scorecard.js";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

const HUDDLE_DAYS = ["thursday", "friday"];

// Huddles are a small, fully-replaced config (a handful of day/time/coach
// groups) rather than a growing collection, so the whole list is replaced
// on every save instead of per-item upsert/delete — simpler for something
// this size, and matches how someone would actually edit it (the whole
// Thursday/Friday schedule at once).
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

  const { huddles } = body || {};
  if (!Array.isArray(huddles)) {
    return NextResponse.json({ ok: false, error: "huddles must be an array" }, { status: 400 });
  }

  const cleanHuddles = [];
  for (const h of huddles) {
    if (!HUDDLE_DAYS.includes(h?.day)) {
      return NextResponse.json(
        { ok: false, error: `Each huddle's day must be one of: ${HUDDLE_DAYS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!h?.time || typeof h.time !== "string") {
      return NextResponse.json({ ok: false, error: "Each huddle needs a time" }, { status: 400 });
    }
    const coaches = Array.isArray(h.coaches)
      ? h.coaches.map((c) => canonicalizeCoachName(String(c).trim())).filter(Boolean)
      : [];
    cleanHuddles.push({
      id: h.id && typeof h.id === "string" ? h.id : randomId("huddle"),
      day: h.day,
      time: h.time.trim(),
      coaches,
    });
  }

  let data;
  try {
    data = await readRegisterHub();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read existing Register Hub data — try again" },
      { status: 500 }
    );
  }
  await writeRegisterHub({ ...data, huddles: cleanHuddles });

  return NextResponse.json({ ok: true, huddles: cleanHuddles });
}
