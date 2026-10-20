import { NextResponse } from "next/server";
import { canonicalizeCoachName } from "../../../../lib/scorecard.js";
import { DAYS_OF_WEEK } from "../../../../lib/registerHub.js";
import { readRegisterHub, writeRegisterHub } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

function randomId() {
  return `school_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Upserts a school: an id in the body updates that school in place,
// otherwise a new one is created. The coach field is canonicalized on
// every save (see canonicalizeCoachName, lib/scorecard.js) so Setup gets
// the "one name per coach" behavior the deck describes for free.
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

  const { id, name, lessonDay, coach, registerLink, active } = body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ ok: false, error: "Missing school name" }, { status: 400 });
  }
  if (!DAYS_OF_WEEK.includes(lessonDay)) {
    return NextResponse.json(
      { ok: false, error: `lessonDay must be one of: ${DAYS_OF_WEEK.join(", ")}` },
      { status: 400 }
    );
  }

  const school = {
    id: id && typeof id === "string" ? id : randomId(),
    name: name.trim(),
    lessonDay,
    coach: coach ? canonicalizeCoachName(String(coach).trim()) : "",
    registerLink: registerLink ? String(registerLink).trim() : "",
    active: active !== false,
  };

  const data = await readRegisterHub();
  const nextSchools = [...data.schools.filter((s) => s.id !== school.id), school].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  await writeRegisterHub({ ...data, schools: nextSchools });

  return NextResponse.json({ ok: true, school });
}

export async function DELETE(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Vercel Blob not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = body || {};
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const data = await readRegisterHub();
  if (!data.schools.some((s) => s.id === id)) {
    return NextResponse.json({ ok: false, error: "No matching school found" }, { status: 404 });
  }

  const nextSchools = data.schools.filter((s) => s.id !== id);
  await writeRegisterHub({ ...data, schools: nextSchools });

  return NextResponse.json({ ok: true, id });
}
