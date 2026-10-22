import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalizeCoachName, splitCoachNames } from "./scorecard.js";
import { expandSchoolImport, mergeHuddleImport, mergeSchoolImport } from "./registerHubImport.js";
import {
  addDaysKey,
  computeResolveBy,
  isConcernOverdue,
  isOpenAsOf,
  rotationWeeksInMonth,
  strikeDueConcerns,
  weekStartKey,
} from "./registerHub.js";
import { buildDailySnapshot, buildWeeklyReport, snapshotAsText } from "./registerHubReport.js";
import { buildDayPoster, quoteFor } from "./registerHubPoster.js";
import { computeCoachScorecard, leadingCoach } from "./registerHubScoring.js";

const importRecords = JSON.parse(
  readFileSync(new URL("../app/data/register-hub-school-import.json", import.meta.url), "utf8")
);

const EVENING_ALL_TICKED = { parentMessage: true, marketingPhoto: true, sentOnTime: true, cleanRegister: true };

// ---- Coach names -----------------------------------------------------------

test("aliases resolve to one canonical name", () => {
  const cases = [
    ["Lu", "Lubabalo"],
    ["Lubabalo", "Lubabalo"],
    ["Thea", "Katheerah"],
    ["Lucky", "Nhlanhla"],
    ["Micky", "Mikael"],
    ["Samu", "Samo"],
    ["Samokelo", "Samo"],
  ];
  for (const [alias, canonical] of cases) {
    assert.equal(canonicalizeCoachName(alias), canonical, alias);
  }
});

test("a shared school splits into separate coaches", () => {
  assert.deepEqual(splitCoachNames("Lu/Sergio"), ["Lubabalo", "Sergio"]);
  assert.deepEqual(splitCoachNames("Thea & Edgar"), ["Katheerah", "Edgar"]);
});

// ---- School import ---------------------------------------------------------

test("a school shared by two coaches gets one import row per coach", () => {
  const rows = expandSchoolImport(importRecords).filter((r) => r.name === "Dibber Montessori Fynbos");
  assert.deepEqual(rows.map((r) => r.coach).sort(), ["Lubabalo", "Sergio"]);
});

test("the school import has no Musa and assigns Laugh Learn Norscot to Samo", () => {
  const rows = expandSchoolImport(importRecords);
  assert.equal(rows.some((r) => r.coach === "Musa"), false);
  const norscot = rows.filter((r) => r.name === "Laugh Learn Norscot");
  assert.deepEqual(norscot.map((r) => r.coach), ["Samo"]);
});

test("every import record has a valid lesson day, a coach and a register link", () => {
  const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  for (const rec of importRecords) {
    assert.ok(validDays.includes(rec.day), `${rec.name} has day ${rec.day}`);
    assert.ok(rec.coaches.length > 0, `${rec.name} has no coach`);
    assert.ok(rec.registerUrl, `${rec.name} has no register link`);
  }
});

test("expanding an import drops unknown days and repeated coaches", () => {
  const rows = expandSchoolImport([
    { name: 'Oak Primary"\t', day: "Sat", coaches: ["Lucky"], registerUrl: "u" },
    { name: "Oak Primary", day: "Mon", coaches: ["Lucky", "Nhlanhla", "Lucky"], registerUrl: "u" },
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    name: "Oak Primary",
    lessonDay: "monday",
    coach: "Nhlanhla",
    registerLink: "u",
    active: true,
  });
});

test("merging an import skips rows already saved, ignoring case", () => {
  const existing = [{ id: "s1", name: "Oak Primary", lessonDay: "monday", coach: "Nhlanhla" }];
  const incoming = [
    { name: "oak primary", lessonDay: "monday", coach: "Nhlanhla", registerLink: "", active: true },
    { name: "Oak Primary", lessonDay: "monday", coach: "Samo", registerLink: "", active: true },
  ];
  const { added, skipped } = mergeSchoolImport(existing, incoming, (prefix) => `${prefix}_test`);
  assert.equal(skipped, 1);
  assert.equal(added.length, 1);
  assert.equal(added[0].coach, "Samo");
  assert.equal(added[0].id, "school_test");
});

// ---- Dates and deadlines ---------------------------------------------------

test("the week starts on the Monday, and days can be added across months", () => {
  assert.equal(weekStartKey("2026-10-18"), "2026-10-12"); // Sunday belongs to the week starting the Monday before
  assert.equal(weekStartKey("2026-10-12"), "2026-10-12");
  assert.equal(addDaysKey("2026-10-31", 1), "2026-11-01");
});

test("a concern is open on the day it was logged and closed once resolved before that date", () => {
  const concern = { date: "2026-10-10", status: "resolved", resolvedAt: "2026-10-12T08:00:00.000Z" };
  assert.equal(isOpenAsOf(concern, "2026-10-09"), false, "not logged yet");
  assert.equal(isOpenAsOf(concern, "2026-10-11"), true, "still open before it was resolved");
  assert.equal(isOpenAsOf(concern, "2026-10-12"), false, "resolved that day");
});

test("a concern past its resolve-by time is overdue only while it is still open", () => {
  const past = "2020-01-01T00:00:00.000Z";
  assert.equal(isConcernOverdue({ status: "open", resolveBy: past }), true);
  assert.equal(isConcernOverdue({ status: "resolved", resolveBy: past }), false);
});

test("an urgent concern must be resolved within 24 hours", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  const resolveBy = computeResolveBy("urgent", { lessonDay: "wednesday" }, { now });
  assert.equal(resolveBy, "2026-10-22T10:00:00.000Z");
});

test("a medium concern is due before the school's next lesson", () => {
  const now = new Date("2026-10-21T10:00:00.000Z");
  const resolveBy = computeResolveBy("medium", { lessonDay: "wednesday" }, { now });
  assert.ok(resolveBy.startsWith("2026-10-28"), `expected the Wednesday after next, got ${resolveBy}`);
});

// ---- Strikes ---------------------------------------------------------------

test("a repeat concern a week later is strike-due", () => {
  const concerns = [
    { id: "a", date: "2026-10-01", school: "X", coach: "Samo", type: "Register not submitted", status: "open", strike: false },
    { id: "b", date: "2026-10-09", school: "X", coach: "Samo", type: "Register not submitted", status: "open", strike: false },
  ];
  assert.deepEqual(strikeDueConcerns(concerns), ["b"]);
});

test("a repeat is not strike-due when the earlier concern was resolved first", () => {
  const concerns = [
    {
      id: "a",
      date: "2026-10-01",
      school: "X",
      coach: "Samo",
      type: "Register not submitted",
      status: "resolved",
      resolvedAt: "2026-10-05T10:00:00.000Z",
      strike: false,
    },
    { id: "b", date: "2026-10-09", school: "X", coach: "Samo", type: "Register not submitted", status: "open", strike: false },
  ];
  assert.deepEqual(strikeDueConcerns(concerns), []);
});

// ---- Daily snapshot --------------------------------------------------------

test("the daily snapshot lists each school once, with its concerns numbered beneath", () => {
  const concerns = [
    { id: "1", date: "2026-10-21", school: "Oak Primary", coach: "Lucky", type: "Register not submitted", urgency: "urgent", resolveBy: "x", note: "" },
    { id: "2", date: "2026-10-21", school: "Oak Primary", coach: "Lucky", type: "Photo missing", urgency: "medium", resolveBy: "y", note: "Chase" },
    { id: "3", date: "2026-10-20", school: "Oak Primary", coach: "Lucky", type: "Old concern", urgency: "medium", resolveBy: "z", note: "" },
  ];
  const snapshot = buildDailySnapshot("2026-10-21", { schools: [], concerns });
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.sections.length, 1);
  assert.equal(snapshot.sections[0].coach, "Nhlanhla");
  assert.equal(snapshot.sections[0].items.length, 2);

  const text = snapshotAsText(snapshot);
  assert.match(text, /Oak Primary \(Nhlanhla\)/);
  assert.match(text, /1\. Register not submitted \(Urgent, resolve in 24h\)/);
  assert.match(text, /2\. Photo missing \(Medium, resolve by next lesson\) — Chase/);
});

test("the daily snapshot says so when nothing was logged", () => {
  const snapshot = buildDailySnapshot("2026-10-21", { schools: [], concerns: [] });
  assert.match(snapshotAsText(snapshot), /No register concerns logged/);
});

// ---- Weekly report ---------------------------------------------------------

test("the weekly report counts lessons, checks and open concerns per canonical coach", () => {
  // A past week, so the report is judged as of the end of that week.
  const schools = [
    { id: "s1", name: "Oak Primary", lessonDay: "wednesday", coach: "Lucky", active: true },
    { id: "s2", name: "Pine Primary", lessonDay: "wednesday", coach: "Nhlanhla", active: true },
  ];
  const dailyChecks = [{ id: "2026-10-07:s1", date: "2026-10-07", evening: EVENING_ALL_TICKED }];
  const concerns = [
    { id: "c1", date: "2026-10-06", school: "Oak Primary", coach: "Lucky", type: "Register not submitted", urgency: "urgent", status: "open", strike: false },
  ];
  const report = buildWeeklyReport("2026-10-07", { schools, dailyChecks, concerns });
  assert.equal(report.weekStart, "2026-10-05");
  assert.equal(report.rows.length, 1);
  const row = report.rows[0];
  assert.equal(row.coach, "Nhlanhla");
  assert.equal(row.lessons, 2);
  assert.equal(row.checked, 1);
  assert.equal(row.unchecked, 1);
  assert.equal(row.eveningPct, 100);
  assert.equal(row.openConcerns, 1);
  assert.equal(row.registerCompliant, false);
  assert.equal(report.needsSupport.length, 1);
});

// ---- Day poster ------------------------------------------------------------

test("the day poster lists only that weekday's active schools, once each, with canonical coaches", () => {
  const schools = [
    { name: "Oak Primary", lessonDay: "wednesday", coach: "Lucky" },
    { name: "Oak Primary", lessonDay: "wednesday", coach: "Nhlanhla" },
    { name: "Pine Primary", lessonDay: "monday", coach: "Samu" },
    { name: "Inactive School", lessonDay: "wednesday", coach: "Samu", active: false },
  ];
  const poster = buildDayPoster("2026-10-07", schools); // a Wednesday
  assert.equal(poster.dayName, "Wednesday");
  assert.deepEqual(poster.rows, [{ school: "Oak Primary", coaches: ["Nhlanhla"] }]);
});

test("the quote of the day is the same for the same date", () => {
  assert.equal(quoteFor("2026-10-07"), quoteFor("2026-10-07"));
  assert.ok(quoteFor("2026-10-07").length > 0);
});

// ---- Player card scoring ---------------------------------------------------

test("a coach with every check, rotation and photo complete scores 100 and is compliant", () => {
  const scorecard = computeCoachScorecard("Nhlanhla", {
    dailyChecks: [
      { id: "a", date: "2026-10-07", coach: "Lucky", evening: EVENING_ALL_TICKED },
      { id: "b", date: "2026-10-14", coach: "Nhlanhla", evening: EVENING_ALL_TICKED },
    ],
    concerns: [],
    rotationChecks: [{ weekKey: "2026-10-05", coach: "Nhlanhla", completed: true, onTime: true, attendedHuddle: true }],
    monthKey: "2026-10",
    todayKey: "2026-10-21",
  });
  assert.equal(scorecard.registerScore, 60);
  assert.equal(scorecard.photoScore, 20);
  assert.equal(scorecard.rotationScore, 20);
  assert.equal(scorecard.total, 100);
  assert.equal(scorecard.compliant.overall, true);
});

test("a rotation week only partly ticked scores only the ticked points", () => {
  const scorecard = computeCoachScorecard("Nhlanhla", {
    dailyChecks: [],
    concerns: [],
    rotationChecks: [{ weekKey: "2026-10-05", coach: "Nhlanhla", completed: true, onTime: false, attendedHuddle: false }],
    monthKey: "2026-10",
    todayKey: "2026-10-21",
  });
  assert.equal(scorecard.rotationScore, 8);
  assert.equal(scorecard.compliant.rotations, false);
});

test("a strike costs 10 points in the month it was issued, not the month the concern was logged", () => {
  const strike = {
    id: "c1",
    date: "2026-09-28",
    coach: "Nhlanhla",
    status: "resolved",
    resolvedAt: "2026-10-01T08:00:00.000Z",
    strike: true,
    strikeAt: "2026-10-15T09:00:00.000Z",
  };
  const base = { dailyChecks: [], rotationChecks: [], monthKey: "2026-10", todayKey: "2026-10-21" };
  const october = computeCoachScorecard("Nhlanhla", { ...base, concerns: [strike] });
  assert.equal(october.strikeCount, 1);
  assert.equal(october.strikePenalty, 10);

  const september = computeCoachScorecard("Nhlanhla", { ...base, monthKey: "2026-09", concerns: [strike] });
  assert.equal(september.strikeCount, 0, "not issued in September");
});

// ---- Rotation calendar and Coach of the Month -----------------------------

test("rotation weeks fall every second Monday from the anchor date", () => {
  assert.deepEqual(rotationWeeksInMonth("2026-10"), ["2026-10-05", "2026-10-19"]);
  assert.deepEqual(rotationWeeksInMonth("2026-11"), ["2026-11-02", "2026-11-16", "2026-11-30"]);
});

test("a rotation week with nothing ticked is not counted against anyone", () => {
  const scorecard = computeCoachScorecard("Nhlanhla", {
    dailyChecks: [],
    concerns: [],
    rotationChecks: [{ weekKey: "2026-10-05", coach: "Nhlanhla", completed: false, onTime: false, attendedHuddle: false }],
    monthKey: "2026-10",
    todayKey: "2026-10-21",
  });
  assert.equal(scorecard.rotationScore, 0);
  assert.equal(scorecard.compliant.rotations, true);
});

test("the coach of the month leader is the highest eligible scorer", () => {
  const card = (coach, total, checkedLessons, strikeCount = 0) => ({
    coach,
    total,
    registerScore: 0,
    checkedLessons,
    strikeCount,
  });
  const scorecards = [
    card("Ineligible", 95, 3), // top score but too few checked lessons
    card("Struck", 90, 6, 1), // top eligible score but has a strike
    card("Leader", 80, 4),
    card("Runner up", 70, 5),
  ];
  assert.equal(leadingCoach(scorecards).coach, "Leader");
  assert.equal(leadingCoach([card("Ineligible", 95, 3)]), null);
});

// ---- Rotation huddles ------------------------------------------------------

test("the bundled rotation huddles are the four slots on the rota", () => {
  const huddles = JSON.parse(
    readFileSync(new URL("../app/data/register-hub-huddle-import.json", import.meta.url), "utf8")
  );
  const rows = huddles.map((h) => ({ ...h, coaches: h.coaches.map(canonicalizeCoachName) }));
  assert.deepEqual(rows.map((h) => `${h.day} ${h.time}`), [
    "thursday 12:00",
    "thursday 12:30",
    "friday 12:00",
    "friday 15:00",
  ]);
  assert.equal(new Set(rows.flatMap((h) => h.coaches)).size, 13);
});

test("a huddle import adds only the huddles not already saved, whatever the coach order", () => {
  const existing = [{ id: "h1", day: "thursday", time: "12:00", coaches: ["Katheerah", "Samo"] }];
  const incoming = [
    { day: "thursday", time: "12:00", coaches: ["Samo", "Katheerah"] },
    { day: "friday", time: "15:00", coaches: ["Jean"] },
  ];
  const { added, skipped } = mergeHuddleImport(existing, incoming, (prefix) => `${prefix}_t`);
  assert.equal(skipped, 1);
  assert.equal(added.length, 1);
  assert.equal(added[0].id, "huddle_t");
});
