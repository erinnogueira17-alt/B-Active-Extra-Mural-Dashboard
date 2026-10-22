// The Register Hub Tracker's monthly compliance scorecard — the deck's
// 100-point formula (slide 20): 60 register compliance + 20 rotation + 20
// photo of the day, minus 10 per strike issued that month.
//
// The photo-of-the-day "pick a daily winner" mechanic (5 points per win,
// capped at 20) isn't built yet — this phase only has the evening-admin
// marketingPhoto tick from Daily check, so photoScore is a stand-in proxy
// (submission rate across the month * 20) until that mechanic exists. It's
// flagged as provisional wherever it's shown.
import { canonicalizeCoachName } from "./scorecard.js";
import { isOpenAsOf, todayDateKey } from "./registerHub.js";

const EVENING_ITEMS = ["parentMessage", "marketingPhoto", "sentOnTime", "cleanRegister"];

function sameCoach(a, b) {
  return canonicalizeCoachName(a || "") === canonicalizeCoachName(b || "");
}

function inMonth(dateKey, monthKey) {
  return typeof dateKey === "string" && dateKey.startsWith(monthKey);
}

export function computeCoachScorecard(coach, { dailyChecks, concerns, rotationChecks, monthKey, todayKey = todayDateKey() }) {
  const checks = (dailyChecks || []).filter((d) => sameCoach(d.coach, coach) && inMonth(d.date, monthKey));
  const allRotation = rotationChecks || [];
  const monthEnd = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const asOf = monthEnd < todayKey ? monthEnd : todayKey;
  const openConcerns = (concerns || []).filter((c) => sameCoach(c.coach, coach) && isOpenAsOf(c, asOf));

  // Register compliance (60 pts): share of the 4 evening-admin items ticked
  // across every lesson checked for this coach this month.
  let registerScore = 0;
  let photoScore = 0;
  if (checks.length > 0) {
    const totalPossible = checks.length * EVENING_ITEMS.length;
    const totalTicked = checks.reduce(
      (sum, c) => sum + EVENING_ITEMS.filter((item) => c.evening?.[item]).length,
      0
    );
    registerScore = (totalTicked / totalPossible) * 60;
    const photosSubmitted = checks.filter((c) => c.evening?.marketingPhoto).length;
    photoScore = (photosSubmitted / checks.length) * 20;
  }
  const photoCompliant = checks.length === 0 || checks.every((c) => c.evening?.marketingPhoto);

  // Rotation (20 pts): only weeks someone actually tracked this month count
  // (the deck's "weeks nobody ticked are not counted against anyone").
  // A week counts once anyone has ticked a box in it. Weeks nobody ticked are
  // not counted against anyone.
  const anyTick = (r) => r.completed || r.onTime || r.attendedHuddle;
  const trackedWeekKeys = [
    ...new Set(allRotation.filter((r) => inMonth(r.weekKey, monthKey) && anyTick(r)).map((r) => r.weekKey)),
  ];
  let rotationScore = 0;
  let rotationCompliant = true;
  if (trackedWeekKeys.length > 0) {
    const weekPoints = trackedWeekKeys.map((weekKey) => {
      const row = allRotation.find((r) => r.weekKey === weekKey && sameCoach(r.coach, coach));
      if (!row) return 0;
      return (row.completed ? 8 : 0) + (row.onTime ? 6 : 0) + (row.attendedHuddle ? 6 : 0);
    });
    rotationScore = weekPoints.reduce((a, b) => a + b, 0) / trackedWeekKeys.length;
    rotationCompliant = weekPoints.every((p) => p === 20);
  }

  // Strikes count by the month they were ISSUED (strikeAt), not the month
  // the underlying concern was originally logged (date) — a strike issued
  // in November for an October concern is an November-month penalty.
  const strikeCount = (concerns || []).filter(
    (c) => sameCoach(c.coach, coach) && c.strike && inMonth(c.strikeAt, monthKey)
  ).length;
  const strikePenalty = strikeCount * 10;

  const total = Math.max(0, registerScore + rotationScore + photoScore - strikePenalty);
  const concernsCompliant = openConcerns.length === 0;

  return {
    checkedLessons: checks.length,
    registerScore,
    rotationScore,
    photoScore,
    strikeCount,
    strikePenalty,
    total,
    compliant: {
      concerns: concernsCompliant,
      rotations: rotationCompliant,
      photo: photoCompliant,
      overall: concernsCompliant && rotationCompliant && photoCompliant,
    },
  };
}

// Coach of the Month rule (from the Register Check artifact): a coach needs
// this many checked lessons in the month and no strike to be eligible.
export const MIN_CHECKED_LESSONS = 4;

// Highest total first. Ties go to the better register score, then the name.
export function sortByScore(scorecards) {
  return [...scorecards].sort(
    (a, b) => b.total - a.total || b.registerScore - a.registerScore || a.coach.localeCompare(b.coach)
  );
}

// The coach leading for Coach of the Month: the highest scorer who is eligible
// this month. Null while nobody is eligible yet.
export function leadingCoach(scorecards) {
  const eligible = scorecards.filter((s) => s.checkedLessons >= MIN_CHECKED_LESSONS && s.strikeCount === 0);
  return sortByScore(eligible)[0] || null;
}
