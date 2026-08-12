import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";

const DATA_KEY = "dashboard-data.json";

// GET: read the current persisted dataset
export async function GET() {
  try {
    const { blobs } = await list({ prefix: DATA_KEY });
    if (blobs.length === 0) {
      return NextResponse.json({ entries: [] });
    }
    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    )[0];
    const res = await fetch(latest.url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: write/update the persisted dataset
export async function POST(request) {
  try {
    const body = await request.json();
    const blob = await put(DATA_KEY, JSON.stringify(body, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
