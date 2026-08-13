// Parses the "Live Dashboard 2026" school roster sheet.
//
// Column layout verified directly against the real sheet (checked via a
// properly-quoted CSV export, since currency/coach-name cells contain
// embedded commas that break naive parsing):
//
//   col 0            = school name (this column has NO header text at all —
//                       it sits under a single-column "School" group label
//                       in the row above the real header row, so it can't be
//                       found by keyword; it's always the first column)
//   col 1            = "Head Coach"
//   "Total Enrollments" = enrolled players
//   "Total Paying"      = paying players (NOT the earlier "Actual paying
//                          Target" column, which is a target, not an actual)
//   "Total" (exact)      = revenue (there is no "Revenue" header anywhere)
//
// The sheet has TWO differently-shaped sub-tables sharing these same three
// metric *names* at different column offsets: the main JHB/CPT roster, and
// a smaller "Soccer and Private coaching" table one column narrower (its
// Total Enrollments/Total Paying/Total columns are each shifted one to the
// left of the main table's). Section markers (JHB/CPT/Soccer) are detected
// by exact cell match (not substring — a real school is named "...SOCCER
// (Register)", which would false-match a substring check). Parsing stops
// entirely at "Contract Schools", where the layout changes again to a
// per-contract billing table with no paying/enrolled columns.

const SECTION_MARKERS = {
  jhb: ["jhb", "johannesburg"],
  cpt: ["cpt", "cape town"],
  soccer: ["soccer"],
};

const SKIP_SUBSTRINGS = ["total", "membership totals", "private coaching"];
const STOP_SUBSTRINGS = ["contract schools"];

// Column indices, relative to the header row, for the main table vs. the
// narrower Soccer sub-table (see comment above).
const COLUMNS = {
  main: { enrolled: 18, paying: 19, revenue: 40 },
  soccer: { enrolled: 17, paying: 18, revenue: 39 },
};

function detectHeaderRowIndex(values) {
  for (let i = 0; i < values.length; i++) {
    const row = values[i] || [];
    if (row.some((c) => (c || "").trim().toLowerCase() === "total paying")) return i;
  }
  return -1;
}

function exactCellMatch(cell, keywords) {
  const text = (cell || "").trim().toLowerCase();
  if (!text) return false;
  return keywords.includes(text);
}

function detectSection(row) {
  for (const [section, keywords] of Object.entries(SECTION_MARKERS)) {
    if (exactCellMatch(row[0], keywords) || exactCellMatch(row[1], keywords)) {
      return section;
    }
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
      reason: 'Could not locate the header row (no cell exactly matching "Total Paying")',
      rows: [],
    };
  }

  const rows = [];
  let currentSection = null;

  for (let i = headerRowIdx + 1; i < values.length; i++) {
    const row = values[i] || [];
    const cell0 = (row[0] || "").trim();
    const cell1 = (row[1] || "").trim();
    if (!cell0 && !row.some((c) => c && String(c).trim())) continue; // fully blank row

    const cell0Lower = cell0.toLowerCase();
    const cell1Lower = cell1.toLowerCase();

    if (STOP_SUBSTRINGS.some((s) => cell0Lower.includes(s) || cell1Lower.includes(s))) break;

    const section = detectSection(row);
    if (section) {
      currentSection = section;
      continue;
    }

    if (SKIP_SUBSTRINGS.some((s) => cell0Lower.includes(s) || cell1Lower.includes(s))) continue;

    if (!cell0) continue;

    const col = currentSection === "soccer" ? COLUMNS.soccer : COLUMNS.main;
    rows.push({
      section: currentSection,
      school: cell0,
      coach: cell1,
      paying: toNumber(row[col.paying]),
      enrolled: toNumber(row[col.enrolled]),
      revenue: toNumber(row[col.revenue]),
    });
  }

  return { parsed: true, headerRowIdx, rows };
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
