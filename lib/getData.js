import { list } from "@vercel/blob";

// Tries to fetch the latest synced JSON snapshot from Vercel Blob; falls
// back to bundled seed data on any failure (blob missing, fetch error, sync
// never run) so the site never shows a blank/broken page. Never fabricates
// data — the fallback is honest placeholder data, and callers get told
// which source was actually used.
export async function getDataWithFallback(blobKey, fallbackData) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Vercel Blob not configured");
    }
    const { blobs } = await list({ prefix: blobKey });
    if (blobs.length === 0) throw new Error("No synced blob yet");

    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    )[0];
    const res = await fetch(latest.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Blob fetch failed (${res.status})`);

    const data = await res.json();
    return { data, source: "live", syncedAt: data.generatedAt || latest.uploadedAt };
  } catch {
    return { data: fallbackData, source: "seed", syncedAt: null };
  }
}
