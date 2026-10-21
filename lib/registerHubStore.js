import { put, list } from "@vercel/blob";
import { canonicalizeCoachName } from "./scorecard.js";

const BLOB_KEY = "register-hub-data.json";

// Saved records can still hold a coach's alias from before it was merged
// (e.g. "Lucky" or "Thea"), so names are canonicalized on every read. That
// way Setup, the tracker, the snapshot and the scorecard all show one name,
// and the next save writes the canonical name back.
function canonicalRow(row, key = "coach") {
  return row && typeof row[key] === "string" ? { ...row, [key]: canonicalizeCoachName(row[key].trim()) } : row;
}

function canonicalCoachPhotos(photos) {
  const out = {};
  for (const [coach, url] of Object.entries(photos)) {
    out[canonicalizeCoachName(coach.trim())] = url;
  }
  return out;
}

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
  const asList = (value) => (Array.isArray(value) ? value : []);
  return {
    schools: asList(data.schools).map((s) => canonicalRow(s)),
    huddles: asList(data.huddles).map((h) => ({
      ...h,
      coaches: Array.isArray(h.coaches) ? h.coaches.map((c) => canonicalizeCoachName(String(c).trim())) : h.coaches,
    })),
    dailyChecks: asList(data.dailyChecks).map((d) => canonicalRow(d)),
    concerns: asList(data.concerns).map((c) => canonicalRow(c)),
    rotationChecks: asList(data.rotationChecks).map((r) => canonicalRow(r)),
    photoOfDay: asList(data.photoOfDay).map((p) => canonicalRow(p)),
    coachPhotos: data.coachPhotos && typeof data.coachPhotos === "object" ? canonicalCoachPhotos(data.coachPhotos) : {},
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
