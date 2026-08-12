// Parses the "Live Dashboard 2026" school roster sheet.
//
// IMPORTANT: the exact column layout and section-header formatting of that
// sheet were not available to this build (no direct read access to it in
// this session), so this parser detects columns by header *keyword*
// matching and detects JHB/CPT/Soccer section breaks by scanning for
// section-name cells, rather than hardcoded column positions. This is more
// resilient to layout drift than fixed positions, but it MUST be verified
// against the real sheet the first time a sync actually runs — check the
// `parsed` / `reason` fields in the sync output, and adjust the keyword
// lists below if columns are misdetected.

const SECTION_KEYWORDS = {
  jhb: ["jhb", "johannesburg"],
  cpt: ["cpt", "cape town"],
  soccer: ["soccer"],
};

const COLUMN_KEYWORDS = {
  school: ["school"],
  coach: ["head coach", "coach"],
  paying: ["paying"],
  enrolled: ["enrolled"],
  revenue: ["revenue"],
};

function detectHeaderRowIndex(values) {
  for (let i = 0; i < values.length; i++) {
    const row = (values[i] || []).map((c) => (c || "").toLowerCase());
    const hasSchool = row.some((c) => c.includes("school"));
    const hasCounts = row.some(
      (c) => c.includes("coach") || c.includes("paying") || c.includes("enrolled")
    );
    if (hasSchool && hasCounts) return i;
  }
  return -1;
}

function findColumn(headerRow, keywords) {
  const lower = headerRow.map((c) => (c || "").toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((c) => c.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

function buildColumnIndex(headerRow) {
  return {
    school: findColumn(headerRow, COLUMN_KEYWORDS.school),
    coach: findColumn(headerRow, COLUMN_KEYWORDS.coach),
    paying: findColumn(headerRow, COLUMN_KEYWORDS.paying),
    enrolled: findColumn(headerRow, COLUMN_KEYWORDS.enrolled),
    revenue: findColumn(headerRow, COLUMN_KEYWORDS.revenue),
  };
}

function detectSection(cellText) {
  const text = (cellText || "").toLowerCase().trim();
  if (!text) return null;
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return section;
  }
  return null;
}

function toNumber(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// values: raw Sheets grid (array of arrays of cell strings).
export function parseSchoolRoster(values) {
  const headerRowIdx = detectHeaderRowIndex(values || []);
  if (headerRowIdx === -1) {
    return {
      parsed: false,
      reason:
        "Could not locate a header row containing school/coach/paying/enrolled columns",
      rows: [],
    };
  }

  const col = buildColumnIndex(values[headerRowIdx]);
  const rows = [];
  let currentSection = null;

  for (let i = headerRowIdx + 1; i < values.length; i++) {
    const row = values[i] || [];
    const nonEmptyCells = row.filter((c) => c && String(c).trim());
    if (nonEmptyCells.length === 0) continue;

    // A row with very few filled cells, where one of them names a known
    // section, is treated as a section-break row rather than data.
    if (nonEmptyCells.length <= 2) {
      const section = detectSection(nonEmptyCells[0]);
      if (section) {
        currentSection = section;
        continue;
      }
    }

    const schoolName = col.school !== -1 ? (row[col.school] || "").trim() : "";
    if (!schoolName || schoolName.toLowerCase().includes("total")) continue;

    rows.push({
      section: currentSection,
      school: schoolName,
      coach: col.coach !== -1 ? (row[col.coach] || "").trim() : "",
      paying: col.paying !== -1 ? toNumber(row[col.paying]) : 0,
      enrolled: col.enrolled !== -1 ? toNumber(row[col.enrolled]) : 0,
      revenue: col.revenue !== -1 ? toNumber(row[col.revenue]) : 0,
    });
  }

  return { parsed: true, headerRowIdx, columnIndex: col, rows };
}

export function aggregateCurrentState(parseResult, { now = new Date() } = {}) {
  const generatedAt = now.toISOString();

  if (!parseResult.parsed || parseResult.rows.length === 0) {
    return {
      generatedAt,
      parsed: false,
      reason: parseResult.reason || "No roster rows found in sheet",
      totals: { payingPlayers: 0, enrolledPlayers: 0, revenue: 0, schools: 0, coaches: 0 },
      sections: {},
      perSchool: [],
      perCoach: [],
    };
  }

  const rows = parseResult.rows;
  const schools = new Set(rows.map((r) => r.school));
  const coaches = new Set(rows.map((r) => r.coach).filter(Boolean));

  const totals = rows.reduce(
    (acc, r) => {
      acc.payingPlayers += r.paying;
      acc.enrolledPlayers += r.enrolled;
      acc.revenue += r.revenue;
      return acc;
    },
    { payingPlayers: 0, enrolledPlayers: 0, revenue: 0 }
  );
  totals.schools = schools.size;
  totals.coaches = coaches.size;

  const sectionAcc = {};
  for (const r of rows) {
    const key = r.section || "unspecified";
    if (!sectionAcc[key]) {
      sectionAcc[key] = { payingPlayers: 0, enrolledPlayers: 0, revenue: 0, schools: new Set() };
    }
    sectionAcc[key].payingPlayers += r.paying;
    sectionAcc[key].enrolledPlayers += r.enrolled;
    sectionAcc[key].revenue += r.revenue;
    sectionAcc[key].schools.add(r.school);
  }
  const sections = Object.fromEntries(
    Object.entries(sectionAcc).map(([k, v]) => [k, { ...v, schools: v.schools.size }])
  );

  const perCoachMap = new Map();
  for (const r of rows) {
    if (!r.coach) continue;
    if (!perCoachMap.has(r.coach)) {
      perCoachMap.set(r.coach, {
        coach: r.coach,
        payingPlayers: 0,
        enrolledPlayers: 0,
        revenue: 0,
        schools: new Set(),
      });
    }
    const c = perCoachMap.get(r.coach);
    c.payingPlayers += r.paying;
    c.enrolledPlayers += r.enrolled;
    c.revenue += r.revenue;
    c.schools.add(r.school);
  }
  const perCoach = [...perCoachMap.values()]
    .map((c) => ({ ...c, schools: c.schools.size }))
    .sort((a, b) => b.payingPlayers - a.payingPlayers);

  const perSchool = rows.slice().sort((a, b) => b.paying - a.paying);

  return { generatedAt, parsed: true, totals, sections, perSchool, perCoach };
}
