// Shared scoring logic for the Coach Scorecard — used by the save API route
// (server-side, so a saved entry's Total/%/Band can never drift from what
// the client showed) and by the board's live preview while someone is still
// filling in ratings. Mirrors the existing "EM Performance Tracker" Excel
// workbook's formulas exactly: same 10 categories, same 0-5 scale, same
// % Score (Rated Only) / % Score (All Categories) split, same band cutoffs.

export const SCORECARD_CATEGORIES = [
  "Coaching Standards",
  "Communication",
  "Involvement",
  "Admin & Marketting",
  "Enrollments",
  "Time Management",
  "Professionalism and Conduct",
  "Client (School/Parent) Satisfaction",
  "EOW Reports",
  "Timesheet Submission",
];

// Some coaches are known to appear under two different names across the
// roster and scorecard data — a nickname vs. their given name, not a
// spelling variant — confirmed directly by the business. This can't be
// caught by fuzzy/token matching the way venue names are (see
// classifyVenue in lib/venueRegion.js): "Mikael" and "Micky" share no
// tokens at all. Keyed lowercase so matching is case-insensitive; every
// alias maps to whichever spelling should be the one shown everywhere
// (Current State, Coach Scorecard, search).
const COACH_NAME_ALIASES = {
  micky: "Mikael",
  samu: "Samo",
  samokelo: "Samo",
  lucky: "Nhlanhla",
  thea: "Katheerah",
  lu: "Lubabalo",
};

// Applied wherever a coach's identity is what matters (Current State
// per-coach totals, the coach dropdown/list, Coach Scorecard grouping) —
// not to the literal string stored on an existing scorecard entry's `coach`
// field, since that string is also embedded in the entry's `id` and
// changing it there would silently orphan that entry from Edit/Delete.
export function canonicalizeCoachName(name) {
  const key = String(name || "").trim().toLowerCase();
  return COACH_NAME_ALIASES[key] || name;
}

// Read-only view of COACH_NAME_ALIASES for display (e.g. the Register
// Hub's Setup tab, matching the deck's "One name per coach: the name check
// spots different spellings and merges them in one tap" line) — the
// aliases themselves stay a hardcoded map, not yet user-editable; this
// just makes the existing list visible rather than adding a new editing UI.
export function listCoachNameAliases() {
  return Object.entries(COACH_NAME_ALIASES).map(([alias, canonical]) => ({
    alias,
    canonical,
  }));
}

// Splits a "Head Coach"-style cell that can hold more than one coach's name
// together — comma-separated ("Lucky, Harnu"), sometimes without a
// space ("Jerome,Romario"), "&"-separated ("Thea & Edgar"), or
// "/"-separated ("Lu/Sergio" — two different coaches, not one person going
// by both names, unlike the aliases above) — into individual names, each
// run through canonicalizeCoachName. Originally lived only in
// lib/currentStateAggregate.js for the roster sheet; shared here so
// anywhere else a multi-coach cell shows up (e.g. the Register Hub's
// shared-school assignments) uses the exact same splitting rules.
export function splitCoachNames(raw) {
  return String(raw || "")
    .split(/[,&/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(canonicalizeCoachName);
}

export const MAX_RATING = 5;

export const RATING_OPTIONS = [
  { value: 0, label: "0 – No selection" },
  { value: 1, label: "1 – Poor (Unsatisfactory Performance)" },
  { value: 2, label: "2 – Needs Improvement (Below Expectations)" },
  { value: 3, label: "3 – Satisfactory (Meets Expectations)" },
  { value: 4, label: "4 – Good (Above Expectations)" },
  { value: 5, label: "5 – Excellent (Outstanding Performance)" },
];

// Applied to "% Score (Rated Only)", same cutoffs as the workbook's
// Performance Bands table (B40:B43): >=90% Excellent, >=75% Good,
// >=60% Satisfactory, >=40% Needs Improvement, else Poor.
const PERFORMANCE_BANDS = [
  { label: "Excellent", min: 0.9 },
  { label: "Good", min: 0.75 },
  { label: "Satisfactory", min: 0.6 },
  { label: "Needs Improvement", min: 0.4 },
];

// Reduces a { [category]: 0-5 } map down to Total, Categories Rated, both
// percentage scores, and the resulting Performance Band — a category left
// at 0 ("No selection") counts toward "All Categories" but not "Rated Only",
// same as the workbook.
export function scoreRatings(ratings) {
  const total = SCORECARD_CATEGORIES.reduce((sum, c) => sum + (ratings?.[c] || 0), 0);
  const categoriesRated = SCORECARD_CATEGORIES.reduce(
    (n, c) => n + ((ratings?.[c] || 0) > 0 ? 1 : 0),
    0
  );
  const pctRatedOnly = categoriesRated > 0 ? total / (categoriesRated * MAX_RATING) : null;
  const pctAllCategories = total / (MAX_RATING * SCORECARD_CATEGORIES.length);
  const band =
    categoriesRated === 0
      ? "Not rated"
      : PERFORMANCE_BANDS.find((b) => pctRatedOnly >= b.min)?.label || "Poor";

  return { total, categoriesRated, pctRatedOnly, pctAllCategories, band };
}

// ISO week (Monday start), e.g. "2026-W36" — used as the weekly period key.
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function currentWeekKey() {
  return isoWeekKey(new Date());
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

// Formats a periodKey for display — "2026-W36" -> "Week 36, 2026",
// "2026-09" -> "September 2026".
export function formatPeriodLabel(periodType, periodKey) {
  if (periodType === "weekly") {
    const [year, week] = periodKey.split("-W");
    return `Week ${Number(week)}, ${year}`;
  }
  const [year, month] = periodKey.split("-");
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
}
