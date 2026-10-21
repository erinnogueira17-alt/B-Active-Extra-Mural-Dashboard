// Pure report builders for the Register Hub: the weekly compliance summary
// (shown on screen and exported to PDF) and the daily concerns list (shared
// to the coach group as an image or text).
import { addDaysKey, dayKeyOf, isOpenAsOf, parseDateKey, todayDateKey, weekStartKey } from "./registerHub.js";
import { canonicalizeCoachName } from "./scorecard.js";

const EVENING_ITEMS = ["parentMessage", "marketingPhoto", "sentOnTime", "cleanRegister"];

export function formatDateLong(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekRange(weekStart) {
  return `${formatDateLong(weekStart)} to ${formatDateLong(addDaysKey(weekStart, 4))}`;
}

// A coach is register-compliant while none of their register concerns is
// still open. Concerns are judged as they stood at the end of the week (or
// today, if the week hasn't finished), so a concern resolved later still
// counts against the week it was open in.
export function buildWeeklyReport(anyDateInWeek, { schools, dailyChecks, concerns }) {
  const weekStart = weekStartKey(anyDateInWeek);
  const weekEnd = addDaysKey(weekStart, 6);
  const todayKey = todayDateKey();
  const asOf = weekEnd < todayKey ? weekEnd : todayKey;
  const weekDates = [0, 1, 2, 3, 4].map((i) => addDaysKey(weekStart, i));
  const activeSchools = schools.filter((s) => s.active !== false && s.coach);
  const coaches = [...new Set(activeSchools.map((s) => canonicalizeCoachName(s.coach)))].sort((a, b) =>
    a.localeCompare(b)
  );

  const rows = coaches.map((coach) => {
    const lessons = [];
    for (const school of activeSchools) {
      if (canonicalizeCoachName(school.coach) !== coach) continue;
      const date = weekDates.find((d) => dayKeyOf(parseDateKey(d)) === school.lessonDay);
      if (date) lessons.push({ school: school.name, schoolId: school.id, date });
    }

    const checks = lessons.map((l) => dailyChecks.find((d) => d.id === `${l.date}:${l.schoolId}`) || null);
    const checked = checks.filter(Boolean);
    const ticks = checked.reduce((n, c) => n + EVENING_ITEMS.filter((k) => c.evening?.[k]).length, 0);
    const eveningPct = checked.length ? Math.round((ticks / (checked.length * EVENING_ITEMS.length)) * 100) : null;

    const coachConcerns = concerns.filter((c) => canonicalizeCoachName(c.coach || "") === coach);
    const weekConcerns = coachConcerns.filter((c) => c.date >= weekStart && c.date <= weekEnd);
    const openAsOf = coachConcerns.filter((c) => isOpenAsOf(c, asOf));
    const detail = [...new Map([...weekConcerns, ...openAsOf].map((c) => [c.id, c])).values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const strikes = concerns.filter(
      (c) =>
        canonicalizeCoachName(c.coach || "") === coach &&
        c.strike &&
        c.strikeAt &&
        c.strikeAt.slice(0, 10) >= weekStart &&
        c.strikeAt.slice(0, 10) <= weekEnd
    ).length;

    return {
      coach,
      lessons: lessons.length,
      checked: checked.length,
      unchecked: lessons.length - checked.length,
      eveningPct,
      loggedThisWeek: weekConcerns.length,
      openConcerns: openAsOf.length,
      concerns: detail.map((c) => ({
        date: c.date,
        school: c.school,
        type: c.type,
        urgency: c.urgency,
        status: isOpenAsOf(c, asOf) ? "open" : "resolved",
      })),
      strikes,
      registerCompliant: openAsOf.length === 0,
    };
  });

  return {
    weekStart,
    weekEnd,
    rows,
    needsSupport: rows.filter((r) => !r.registerCompliant || r.strikes > 0),
  };
}

export function buildDailySnapshot(dateKey, { schools, concerns }) {
  const dayConcerns = concerns.filter((c) => c.date === dateKey);
  const byCoach = new Map();
  for (const c of dayConcerns) {
    const coach = canonicalizeCoachName(c.coach || "") || "No coach set";
    if (!byCoach.has(coach)) byCoach.set(coach, []);
    byCoach.get(coach).push(c);
  }
  const sections = [...byCoach.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([coach, items]) => ({
      coach,
      items: items.map((c) => ({
        school: c.school,
        type: c.type,
        urgency: c.urgency,
        resolveBy: c.resolveBy,
        note: c.note || "",
      })),
    }));
  return { dateKey, title: formatDateLong(dateKey), total: dayConcerns.length, sections, schoolCount: schools.length };
}

export function snapshotAsText(snapshot) {
  if (snapshot.total === 0) return `Register concerns — ${snapshot.title}\nNo register concerns logged. All coaches compliant.`;
  const lines = [`Register concerns — ${snapshot.title}`];
  for (const section of snapshot.sections) {
    lines.push("", section.coach);
    for (const item of section.items) {
      const urgency = item.urgency === "urgent" ? "Urgent, resolve in 24h" : "Medium, resolve by next lesson";
      lines.push(`- ${item.school}: ${item.type} (${urgency})${item.note ? ` — ${item.note}` : ""}`);
    }
  }
  return lines.join("\n");
}
