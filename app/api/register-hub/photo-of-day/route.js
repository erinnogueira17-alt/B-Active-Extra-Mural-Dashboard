import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

// Saves one finished photo-of-the-day post for a date. The image goes to
// Blob storage and the record (date, school, coach, image URL) goes in the
// shared Register Hub document. A second save for the same date replaces
// the earlier record.
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
  const date = formData.get("date");
  const schoolId = formData.get("schoolId");
  const school = formData.get("school");
  const coach = formData.get("coach") || "";

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "Missing image" }, { status: 400 });
  }
  if (file.type !== "image/png") {
    return NextResponse.json({ ok: false, error: "The post must be a PNG image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Post image is larger than 8MB" }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ ok: false, error: "date must be an ISO date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!school) {
    return NextResponse.json({ ok: false, error: "Missing school" }, { status: 400 });
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

  const id = randomId("photo");
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`register-hub-photos/${date}-${randomId("post")}.png`, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/png",
  });

  const record = {
    id,
    date: String(date),
    schoolId: schoolId ? String(schoolId) : "",
    school: String(school),
    coach: String(coach),
    imageUrl: blob.url,
    createdAt: new Date().toISOString(),
  };
  const photoOfDay = [...data.photoOfDay.filter((p) => p.date !== record.date), record].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  await writeRegisterHub({ ...data, photoOfDay });

  return NextResponse.json({ ok: true, record });
}
