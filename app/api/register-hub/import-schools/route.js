import { NextResponse } from "next/server";
import importRecords from "../../../data/register-hub-school-import.json";
import { expandSchoolImport, mergeSchoolImport } from "../../../../lib/registerHubImport.js";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

// Loads the register school list (school, lesson day, coach, register link)
// into Register Hub. Adds anything not already there; existing entries with
// the same name, lesson day and coach are left untouched.
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

  const { added, skipped } = mergeSchoolImport(data.schools, expandSchoolImport(importRecords), randomId);
  const schools = [...data.schools, ...added].sort((a, b) => a.name.localeCompare(b.name));
  await writeRegisterHub({ ...data, schools });

  return NextResponse.json({ ok: true, added: added.length, skipped, schools });
}
