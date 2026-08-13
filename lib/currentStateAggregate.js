// Parses the "Live Dashboard 2026" school roster sheet.
//
// Column layout verified directly against the real sheet (checked via a
// properly-quoted CSV export, since currency/coach-name cells contain
// embedded commas that break naive parsing):
//
//   col 0 = school name (this column has NO header text at all — it sits
//           under a single-column "School" group label in the row above
//           the real header row, so it can't be found by keyword; it's
//           always the first column)
//   col 1 = "Head Coach"
//   "Total Enrollments" = enrolled players (always the column immediately
//           before "Total Paying" — confirmed in both sub-tables below)
//   "Total Paying"       = paying players (NOT "Actual paying Target",
//           which is a target, not an actual)
//   "Total" (exact match) = revenue (there is no "Revenue" header anywhere)
//
// The sheet contains more than one differently-shaped sub-table using these
// same column *names* at different offsets: the main JHB/CPT roster, and a
// narrower "Soccer and Private coaching" table. Rather than hardcode an
// offset per known sub-table (fragile if the sheet gains another one), the
// parser re-locates each sub-table's own header row live by scanning for a
// cell that exactly matches "Total Paying", and re-derives column positions
// from *that* row each time. Section markers (JHB/CPT/Soccer) are detected
// by exact cell match (not substring — a real school is named "...SOCCER
// (Register)", which would false-match a substring check). Parsing stops
// entirely at "Contract Schools", where the layout changes again to a
// per-contract billing table with no paying/enrolled columns.

const SECTION_MARKERS = {
  jhb: ["jhb", "johannesburg"],
  cpt: ["cpt", "cape town"],
  soccer: ["soccer"],
};

const SKIP_SUBSTRINGS = ["total", "membership totals"];
const STOP_SUBSTRINGS = ["contract schools"];

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

// A row IS a header row (not data) if some cell exactly equals "Total
// Paying" — that's true of every sub-table's header in this sheet. Column
// positions are derived relative to that cell.
function tryReadHeader(row) {
  const payingIdx = row.findIndex((c) => (c || "").trim().toLowerCase() === "total paying");
  if (payingIdx === -1) return null;
  const revenueIdx = row.findIndex(
    (c, idx) => idx > payingIdx && (c || "").trim().toLowerCase() === "total"
  );
  return { paying: payingIdx, enrolled: payingIdx - 1, revenue: revenueIdx };
}

// values: raw Sheets grid (array of arrays of cell strings).
export function parseSchoolRoster(values) {
  const rows = [];
  let currentSection = null;
  let cols = null;
  let firstHeaderRowIdx = -1;

  for (let i = 0; i < (values || []).length; i++) {
    const row = values[i] || [];

    const header = tryReadHeader(row);
    if (header) {
      cols = header;
      if (firstHeaderRowIdx === -1) firstHeaderRowIdx = i;
      continue;
    }
    if (!cols) continue; // haven't reached the first sub-table's header yet

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

    rows.push({
      section: currentSection,
      school: cell0,
      coach: cell1,
      paying: toNumber(row[cols.paying]),
      enrolled: cols.enrolled >= 0 ? toNumber(row[cols.enrolled]) : 0,
      revenue: cols.revenue !== -1 ? toNumber(row[cols.revenue]) : 0,
    });
  }

  if (firstHeaderRowIdx === -1) {
    return {
      parsed: false,
      reason: 'Could not locate any header row (no cell exactly matching "Total Paying")',
      rows: [],
    };
  }

  return { parsed: true, headerRowIdx: firstHeaderRowIdx, rows };
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
