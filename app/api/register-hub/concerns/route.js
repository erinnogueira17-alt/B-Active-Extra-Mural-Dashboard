import { NextResponse } from "next/server";
import { strikeEligibleConcerns } from "../../../../lib/registerHub.js";
import { readRegisterHub, writeRegisterHub } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

const ACTIONS = ["resolve", "reply", "strike"];

// One action per call, by concern id: resolve it, log a coach reply, or
// issue a strike (only when strikeEligibleConcerns agrees it's due — issuing
// a strike is a manual confirm, not something this route does on its own).
export async function PATCH(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Vercel Blob not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, action, reply } = body || {};
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ ok: false, error: `action must be one of: ${ACTIONS.join(", ")}` }, { status: 400 });
  }
  if (action === "reply" && !(reply && String(reply).trim())) {
    return NextResponse.json({ ok: false, error: "Reply text is required" }, { status: 400 });
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

  const concern = data.concerns.find((c) => c.id === id);
  if (!concern) {
    return NextResponse.json({ ok: false, error: "No matching concern found" }, { status: 404 });
  }

  const now = new Date();
  let updated = concern;
  if (action === "resolve") {
    updated = { ...concern, status: "resolved", resolvedAt: now.toISOString() };
  } else if (action === "reply") {
    updated = { ...concern, reply: String(reply).trim(), repliedAt: now.toISOString() };
  } else if (action === "strike") {
    const eligibleIds = strikeEligibleConcerns(data.concerns, now);
    if (!eligibleIds.includes(id)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This concern isn't strike-eligible yet — it needs a repeat at the same school, still unresolved 14 days after it was first logged",
        },
        { status: 400 }
      );
    }
    updated = { ...concern, strike: true, strikeAt: now.toISOString() };
  }

  const nextConcerns = data.concerns.map((c) => (c.id === id ? updated : c));
  await writeRegisterHub({ ...data, concerns: nextConcerns });

  return NextResponse.json({ ok: true, concern: updated });
}
