import { NextResponse } from "next/server";
import importHuddles from "../../../data/register-hub-huddle-import.json";
import { canonicalizeCoachName } from "../../../../lib/scorecard.js";
import { mergeHuddleImport } from "../../../../lib/registerHubImport.js";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

// Loads the rotation huddle schedule into Register Hub. Adds any huddle not
// already saved (same day, time and coaches); saved huddles are left alone.
export async function POST() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Vercel Blob not configured" }, { status: 500 });
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

  const rows = importHuddles.map((h) => ({
    ...h,
    coaches: h.coaches.map((c) => canonicalizeCoachName(c)),
  }));
  const { added, skipped } = mergeHuddleImport(data.huddles, rows, randomId);
  const huddles = [...data.huddles, ...added];
  await writeRegisterHub({ ...data, huddles });

  return NextResponse.json({ ok: true, added: added.length, skipped, huddles });
}
