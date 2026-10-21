import { canonicalizeCoachName } from "./scorecard.js";

const DAY_NAMES = { Mon: "monday", Tue: "tuesday", Wed: "wednesday", Thu: "thursday", Fri: "friday" };

const schoolKey = (s) => `${s.name.toLowerCase()}|${s.lessonDay}|${s.coach.toLowerCase()}`;

// A shared school gets one row per coach, all with the same register link,
// matching the deck's "each coach at a shared school is scored on their own
// line". Names are cleaned of stray quotes and tabs from the source sheet.
export function expandSchoolImport(records) {
  const rows = [];
  const seen = new Set();
  for (const rec of records) {
    const lessonDay = DAY_NAMES[rec.day];
    if (!lessonDay) continue;
    const name = String(rec.name).replace(/[\s"]+$/, "").replace(/\s+/g, " ").trim();
    const registerLink = String(rec.registerUrl || "").trim();
    for (const raw of rec.coaches) {
      const coach = canonicalizeCoachName(String(raw).replace(/\s+/g, " ").trim());
      if (!coach) continue;
      const row = { name, lessonDay, coach, registerLink, active: true };
      const key = schoolKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  return rows;
}

export function mergeSchoolImport(existingSchools, importRows, makeId) {
  const existing = new Set(existingSchools.map((s) => schoolKey({ ...s, coach: s.coach || "" })));
  const added = importRows
    .filter((row) => !existing.has(schoolKey(row)))
    .map((row) => ({ id: makeId("school"), ...row }));
  return { added, skipped: importRows.length - added.length };
}
