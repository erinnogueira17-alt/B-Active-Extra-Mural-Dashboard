// Shared constants and date logic for the Register Hub — the daily
// register-compliance, rotation and scorecard tool described in the
// "B-Active Register Check Hub" deck. Phase 1 only (Setup + Daily check);
// later phases (Snapshot, Tracker, Scorecard, Weekly report) reuse these
// same constants.

// The eight register concerns operations checks for on every register,
// confirmed directly from the deck.
export const CONCERN_TYPES = [
  "Attendance not marked",
  "Trial players not added",
  "Intentions not loaded",
  "New enrolments not added",
  "B-less not updated",
  "Register not submitted",
  "Wrong lesson date",
  "Duplicate players",
];

// Urgent: resolve within 24 hours. Medium: resolve by the coach's next
// lesson at that school — the deck's own two-tier urgency split.
export const URGENCY_LEVELS = ["urgent", "medium"];

export const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

export function dayLabel(day) {
  return DAY_LABELS[day] || day;
}

// JS Date#getUTCDay(): 0=Sunday..6=Saturday. Only Mon-Fri are real lesson
// days, matching DAYS_OF_WEEK. Everything below uses the UTC getters/
// setters deliberately, never the local-time ones — a date-only value like
// "which day is 2026-10-20" must read the same regardless of which
// timezone the viewer's browser (or the server) happens to be in; local-
// time Date methods would silently shift the weekday for anyone viewing
// from west of UTC.
const JS_DAY_INDEX = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };

export function dayKeyOf(date) {
  const idx = date.getUTCDay();
  return Object.keys(JS_DAY_INDEX).find((k) => JS_DAY_INDEX[k] === idx) || null;
}

// Parses a "YYYY-MM-DD" date-only string (e.g. a <input type="date"> value)
// into a UTC-midnight Date — the one safe way to turn that kind of string
// into a Date without the bare `new Date(str)` / local-timezone pitfalls
// above.
export function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// The next real-calendar occurrence of `dayName` on/after `from` (strictly
// after `from` when `inclusive` is false) — used both to find "today's
// schools" and to compute a medium concern's resolve-by date (that
// school's *next* lesson, not today's, even if today happens to be that
// day).
export function nextOccurrenceOf(dayName, from, { inclusive = true } = {}) {
  const target = JS_DAY_INDEX[dayName];
  if (target == null) return null;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let diff = (target - d.getUTCDay() + 7) % 7;
  if (diff === 0 && !inclusive) diff = 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// Urgent concerns: 24 hours from the real moment the concern was logged
// (`now`), time-of-day included, so two concerns logged hours apart don't
// share a resolve-by moment. Medium concerns: that school's next lesson
// date — not the next calendar day, but the next real occurrence of its
// lessonDay — counted from the daily check's own `date` (`referenceDate`,
// defaulting to `now` if not given), not from the real save instant. That
// distinction matters when backfilling a past day's check: "next lesson"
// should mean the day after the lesson being checked, not the day after
// whoever happened to click Save. `school` is optional for urgent (not
// needed); required for medium (falls back to the same 24h-from-now rule
// if the school/lessonDay is missing, rather than returning an
// unresolvable null).
export function computeResolveBy(urgency, school, { now = new Date(), referenceDate } = {}) {
  if (urgency === "urgent" || !school?.lessonDay) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
  const next = nextOccurrenceOf(school.lessonDay, referenceDate || now, { inclusive: false });
  return (next || new Date(now.getTime() + 24 * 60 * 60 * 1000)).toISOString();
}

export function todayDateKey(now = new Date()) {
  const d = new Date(now);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// A concern is overdue once its own resolve-by moment has passed and it's
// still open — used by the Tracker to flag concerns that missed their
// urgent/medium deadline, independent of the stricter 14-day strike rule
// below.
export function isConcernOverdue(concern, now = new Date()) {
  return concern.status === "open" && new Date(concern.resolveBy).getTime() < now.getTime();
}

// The deck's strike rule (slide 12): a concern is logged, the SAME concern
// (same school + type) gets logged again later, and the earliest occurrence
// is still unresolved 14 days after it was first logged — that's when a
// strike is due. Resolving it at any point stops the clock; if it recurs
// again afterwards, a fresh 14-day window starts from that later occurrence
// (handled naturally here since a resolved earliest concern is excluded).
// Returns the ids of the earliest concern in each strike-eligible group.
// Issuing the strike itself is still a manual confirm (see the concerns
// PATCH route) — this only flags eligibility, it never sets `strike` itself.
export function strikeEligibleConcerns(concerns, now = new Date()) {
  const groups = new Map();
  for (const c of concerns) {
    const key = `${c.school}::${c.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const eligibleIds = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const earliest = group.reduce((a, b) => (new Date(a.date) <= new Date(b.date) ? a : b));
    if (earliest.status !== "open" || earliest.strike) continue;
    const ageDays = (now.getTime() - new Date(earliest.date).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays >= 14) eligibleIds.push(earliest.id);
  }
  return eligibleIds;
}
