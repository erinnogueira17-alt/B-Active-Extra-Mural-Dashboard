import { NextResponse } from "next/server";
import { canonicalizeCoachName } from "../../../../lib/scorecard.js";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

// Upserts one coach's rotation-week record (completed / on time / attended
// huddle — 8/6/6 points, per the deck). Keyed by (weekKey, coach) when no id
// is given, so re-ticking the same coach's same week updates it in place
// rather than creating a duplicate row.
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

  const { id, weekKey, coach, completed, onTime, attendedHuddle } = body || {};
  if (!weekKey || !/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return NextResponse.json({ ok: false, error: "weekKey must be an ISO date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!coach || !String(coach).trim()) {
    return NextResponse.json({ ok: false, error: "Missing coach" }, { status: 400 });
  }

  const coachName = canonicalizeCoachName(String(coach).trim());

  let data;
  try {
    data = await readRegisterHub();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read existing Register Hub data — try again" },
      { status: 500 }
    );
  }

  const existing = id
    ? data.rotationChecks.find((r) => r.id === id)
    : data.rotationChecks.find((r) => r.weekKey === weekKey && canonicalizeCoachName(r.coach) === coachName);

  const row = {
    id: existing?.id || randomId("rotation"),
    weekKey,
    coach: coachName,
    completed: !!completed,
    onTime: !!onTime,
    attendedHuddle: !!attendedHuddle,
    evidenceFiles: existing?.evidenceFiles || [],
    updatedAt: new Date().toISOString(),
  };

  const nextRotationChecks = [...data.rotationChecks.filter((r) => r.id !== row.id), row];
  await writeRegisterHub({ ...data, rotationChecks: nextRotationChecks });

  return NextResponse.json({ ok: true, rotationCheck: row });
}
