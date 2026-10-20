import { NextResponse } from "next/server";
import {
  CONCERN_TYPES,
  URGENCY_LEVELS,
  computeResolveBy,
  parseDateKey,
} from "../../../../lib/registerHub.js";
import { readRegisterHub, writeRegisterHub } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Upserts one school's check for one day: the evening-admin booleans plus
// whatever concerns were tapped for it. Keyed by (date, schoolId) — saving
// the same school/day again (e.g. correcting a tick) replaces that day's
// check AND replaces its concerns with whatever was submitted this time,
// rather than appending duplicates alongside the old ones.
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

  const { date, schoolId, evening, concerns, checkedBy } = body || {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "date must be an ISO date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!schoolId) {
    return NextResponse.json({ ok: false, error: "Missing schoolId" }, { status: 400 });
  }
  if (!Array.isArray(concerns)) {
    return NextResponse.json({ ok: false, error: "concerns must be an array" }, { status: 400 });
  }

  const data = await readRegisterHub();
  const school = data.schools.find((s) => s.id === schoolId);
  if (!school) {
    return NextResponse.json({ ok: false, error: "No matching school found" }, { status: 404 });
  }

  const id = `${date}:${schoolId}`;
  const now = new Date();
  const dailyCheck = {
    id,
    date,
    schoolId,
    school: school.name,
    coach: school.coach,
    evening: {
      parentMessage: !!evening?.parentMessage,
      marketingPhoto: !!evening?.marketingPhoto,
      sentOnTime: !!evening?.sentOnTime,
      cleanRegister: !!evening?.cleanRegister,
    },
    checkedAt: now.toISOString(),
    checkedBy: checkedBy ? String(checkedBy).trim() : "",
  };

  const cleanConcerns = [];
  for (const c of concerns) {
    if (!CONCERN_TYPES.includes(c?.type)) {
      return NextResponse.json(
        { ok: false, error: `Each concern's type must be one of the 8 register concerns` },
        { status: 400 }
      );
    }
    if (!URGENCY_LEVELS.includes(c?.urgency)) {
      return NextResponse.json(
        { ok: false, error: `Each concern's urgency must be one of: ${URGENCY_LEVELS.join(", ")}` },
        { status: 400 }
      );
    }
    cleanConcerns.push({
      id: randomId("concern"),
      dailyCheckId: id,
      date,
      school: school.name,
      coach: school.coach,
      type: c.type,
      urgency: c.urgency,
      resolveBy: computeResolveBy(c.urgency, school, { now, referenceDate: parseDateKey(date) }),
      note: c.note ? String(c.note).trim() : "",
      status: "open",
    });
  }

  const nextDailyChecks = [...data.dailyChecks.filter((d) => d.id !== id), dailyCheck];
  // Replaces this check's own concerns on re-save, leaving every other
  // day/school's concerns (and any already in progress in Tracker, once
  // that phase exists) untouched.
  const nextConcerns = [...data.concerns.filter((c) => c.dailyCheckId !== id), ...cleanConcerns];

  await writeRegisterHub({ ...data, dailyChecks: nextDailyChecks, concerns: nextConcerns });

  return NextResponse.json({ ok: true, dailyCheck, concerns: cleanConcerns });
}
