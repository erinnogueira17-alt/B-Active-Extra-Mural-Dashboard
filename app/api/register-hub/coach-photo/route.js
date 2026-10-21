import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { canonicalizeCoachName } from "../../../../lib/scorecard.js";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Stores one photo per coach for their player card. A new upload replaces
// the coach's earlier photo in the shared Register Hub document.
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
  const coachRaw = formData.get("coach");

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "Missing photo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "Photo must be a PNG, JPEG or WebP image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Photo is larger than 5MB" }, { status: 400 });
  }
  const coach = canonicalizeCoachName(String(coachRaw || "").trim());
  if (!coach) {
    return NextResponse.json({ ok: false, error: "Missing coach" }, { status: 400 });
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`register-hub-coach-photos/${randomId("coach")}-${file.name || "photo"}`, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  await writeRegisterHub({ ...data, coachPhotos: { ...data.coachPhotos, [coach]: blob.url } });

  return NextResponse.json({ ok: true, coach, imageUrl: blob.url });
}
