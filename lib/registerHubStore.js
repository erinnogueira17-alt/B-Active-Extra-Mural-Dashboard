import { put, list } from "@vercel/blob";

const BLOB_KEY = "register-hub-data.json";

// Unlike the Coach Scorecard routes (each with its own small blob helper,
// since those are genuinely independent per-route collections), the three
// Register Hub routes (schools, huddles, daily-check) all read and write
// the SAME shared document — schools, huddles, dailyChecks and concerns
// together. Sharing one read/write pair here keeps all three routes
// agreeing on the document's shape instead of each reimplementing its own
// slightly different defaults.
export async function readRegisterHub() {
  const empty = { schools: [], huddles: [], dailyChecks: [], concerns: [] };
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return empty;
    const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    const res = await fetch(latest.url, { cache: "no-store" });
    if (!res.ok) return empty;
    const data = await res.json();
    return {
      schools: Array.isArray(data.schools) ? data.schools : [],
      huddles: Array.isArray(data.huddles) ? data.huddles : [],
      dailyChecks: Array.isArray(data.dailyChecks) ? data.dailyChecks : [],
      concerns: Array.isArray(data.concerns) ? data.concerns : [],
    };
  } catch {
    return empty;
  }
}

export async function writeRegisterHub(data) {
  await put(
    BLOB_KEY,
    JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    }
  );
}
