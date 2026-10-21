import { put, list } from "@vercel/blob";

const BLOB_KEY = "register-hub-data.json";

// Unlike the Coach Scorecard routes (each with its own small blob helper,
// since those are genuinely independent per-route collections), the three
// Register Hub routes (schools, huddles, daily-check) all read and write
// the SAME shared document — schools, huddles, dailyChecks and concerns
// together. Sharing one read/write pair here keeps all three routes
// agreeing on the document's shape instead of each reimplementing its own
// slightly different defaults.
//
// Deliberately does NOT swallow read failures into an empty document the
// way the Coach Scorecard's readEntries does — that's safe there because a
// failed read only ever risks overwriting one flat list of entries, but
// here all four collections share one document, so treating "the read
// failed" the same as "nothing saved yet" would let a single transient
// Blob hiccup during a school/huddle/daily-check save silently wipe every
// other collection too. Only a genuinely empty prefix list (no blob has
// ever been written) returns the empty shape; every other failure
// (list()/fetch() throwing, a non-ok response, bad JSON) throws, and
// callers must not write on that path — see each route's try/catch around
// this call.
export async function readRegisterHub() {
  const empty = { schools: [], huddles: [], dailyChecks: [], concerns: [], rotationChecks: [], photoOfDay: [], coachPhotos: {} };
  const { blobs } = await list({ prefix: BLOB_KEY });
  if (blobs.length === 0) return empty;
  const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  const res = await fetch(latest.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Register Hub blob fetch failed (${res.status})`);
  const data = await res.json();
  return {
    schools: Array.isArray(data.schools) ? data.schools : [],
    huddles: Array.isArray(data.huddles) ? data.huddles : [],
    dailyChecks: Array.isArray(data.dailyChecks) ? data.dailyChecks : [],
    concerns: Array.isArray(data.concerns) ? data.concerns : [],
    rotationChecks: Array.isArray(data.rotationChecks) ? data.rotationChecks : [],
    photoOfDay: Array.isArray(data.photoOfDay) ? data.photoOfDay : [],
    coachPhotos: data.coachPhotos && typeof data.coachPhotos === "object" ? data.coachPhotos : {},
  };
}

// Shared by all three Register Hub routes (schools, huddles, daily-check)
// instead of each redefining its own copy.
export function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
