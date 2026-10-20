import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { readRegisterHub, writeRegisterHub, randomId } from "../../../../lib/registerHubStore.js";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const TARGET_COLLECTIONS = { concern: "concerns", rotation: "rotationChecks" };

// Unlike every other Register Hub route, this one stores a user-uploaded
// binary file (not a JSON document), so addRandomSuffix is true — each
// upload is a distinct file, not a replace-in-place record. Only images and
// PDFs are accepted as evidence, capped at 10MB.
function isAllowedFileType(type) {
  return typeof type === "string" && (type.startsWith("image/") || type === "application/pdf");
}

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
  const targetType = formData.get("targetType");
  const targetId = formData.get("targetId");

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }
  const collectionKey = TARGET_COLLECTIONS[targetType];
  if (!collectionKey) {
    return NextResponse.json(
      { ok: false, error: `targetType must be one of: ${Object.keys(TARGET_COLLECTIONS).join(", ")}` },
      { status: 400 }
    );
  }
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Missing targetId" }, { status: 400 });
  }
  if (!isAllowedFileType(file.type)) {
    return NextResponse.json({ ok: false, error: "Only images and PDFs can be attached as evidence" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File is larger than 10MB" }, { status: 400 });
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

  const collection = data[collectionKey] || [];
  const targetIndex = collection.findIndex((item) => item.id === targetId);
  if (targetIndex === -1) {
    return NextResponse.json({ ok: false, error: "No matching record found to attach evidence to" }, { status: 404 });
  }

  const evidenceId = randomId("evidence");
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`register-hub-evidence/${evidenceId}-${file.name}`, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const evidenceFile = { id: evidenceId, url: blob.url, filename: file.name, uploadedAt: new Date().toISOString() };
  const updatedTarget = {
    ...collection[targetIndex],
    evidenceFiles: [...(collection[targetIndex].evidenceFiles || []), evidenceFile],
  };
  const nextCollection = [...collection];
  nextCollection[targetIndex] = updatedTarget;

  await writeRegisterHub({ ...data, [collectionKey]: nextCollection });

  return NextResponse.json({ ok: true, evidenceFile, target: updatedTarget });
}
