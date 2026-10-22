import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalizeCoachName, splitCoachNames } from "./scorecard.js";
import { expandSchoolImport } from "./registerHubImport.js";
import { strikeDueConcerns } from "./registerHub.js";
import { computeCoachScorecard } from "./registerHubScoring.js";

const importRecords = JSON.parse(
  readFileSync(new URL("../app/data/register-hub-school-import.json", import.meta.url), "utf8")
);

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

test("a concern logged under an alias counts against the canonical coach", () => {
  const concern = {
    id: "c1",
    date: "2026-10-03",
    school: "Smiley Kids Sandton",
    coach: "Lucky",
    type: "Register not submitted",
    status: "open",
    strike: false,
  };
  const scorecardFor = (concerns) =>
    computeCoachScorecard("Nhlanhla", {
      dailyChecks: [],
      concerns,
      rotationChecks: [],
      monthKey: "2026-10",
      todayKey: "2026-10-21",
    });
  assert.equal(scorecardFor([]).compliant.concerns, true);
  assert.equal(scorecardFor([concern]).compliant.concerns, false);
});
