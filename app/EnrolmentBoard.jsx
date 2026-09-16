"use client";

import { useState } from "react";
import { BreakdownList, PeriodCompare, LossValue } from "./CompareBlock.jsx";
import TopicBoard from "./TopicBoard.jsx";

// Order and labels for the region breakdown. Football/Soccer is
// deliberately absent — the business only wants extramural (JHB/CPT) data
// on this dashboard, and aggregateGrowth already excludes football rows
// from every metric before this ever renders, so there's no "football"
// bucket left to label here. "unclassified" only renders when it
// actually has data — it exists so venues that don't confidently match a
// known school are shown honestly instead of silently folded into the
// wrong region.
const REGION_ORDER = ["jhb", "cpt", "unclassified"];
const REGION_LABELS = {
  jhb: "Johannesburg extramural",
  cpt: "Cape Town extramural",
  unclassified: "Unclassified",
};

// Each unclassified row's raw venue text, tallied by real occurrence count
// (see unclassifiedVenuesOf in lib/aggregate.js) — this is the concrete,
// actionable list: whatever shows up here is a real school/venue whose text
// on the intake forms didn't overlap enough with the roster's spelling of
// it to auto-match. Fixing one of these means either correcting the venue
// dropdown text (or the roster's school name) so they read closer to each
// other, or — if it's a genuinely new/renamed school — adding it to the
// Current State roster so a future sync can match it.
function UnclassifiedVenues({ venues }) {
  if (!venues || venues.length === 0) return null;
  return (
    <div className="card" style={{ marginTop: "1.25rem" }}>
      <h3 className="section-title" style={{ marginBottom: "0.5rem" }}>
        Unclassified venues
      </h3>
      <p className="section-subtitle">
        These are the actual venue names on the intake forms that couldn&apos;t be confidently
        matched to a school on the Current State roster. To allocate one to JHB or CPT, make its
        spelling on the roster and on the form&apos;s venue list line up more closely — or, if
        it&apos;s a new or renamed school, add it to the roster.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Venue text (as submitted)</th>
              <th>Rows</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.venue}>
                <td>{v.venue}</td>
                <td>{v.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegionBreakdown({ regionTotals, regionTotalsMonthToDate, unclassifiedVenues }) {
  const [period, setPeriod] = useState(regionTotalsMonthToDate ? "mtd" : "season");
  const totals = period === "mtd" ? regionTotalsMonthToDate : regionTotals;
  const venues = period === "mtd" ? unclassifiedVenues?.monthToDate : unclassifiedVenues?.season;

  if (!regionTotals) return <div className="empty-state">No data yet.</div>;

  const entries = REGION_ORDER.map((key) => ({ key, ...totals?.[key] })).filter(
    (r) => (r.intentions || 0) + (r.enrolments || 0) + (r.bless || 0) > 0
  );

  return (
    <div>
      <div className="name-pill-list" style={{ marginBottom: "1.25rem" }}>
        <button
          className={`name-pill${period === "mtd" ? " active" : ""}`}
          onClick={() => setPeriod("mtd")}
          type="button"
          disabled={!regionTotalsMonthToDate}
        >
          Month to date
        </button>
        <button
          className={`name-pill${period === "season" ? " active" : ""}`}
          onClick={() => setPeriod("season")}
          type="button"
        >
          Full season
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">No data yet for this period.</div>
      ) : (
        <>
          {entries.some((e) => e.key === "unclassified") && (
            <p className="section-subtitle">
              Unclassified rows are venues the sync couldn&apos;t confidently match to a known
              school — shown separately rather than guessed into the wrong region.
            </p>
          )}
          <div className="card-grid">
            {entries.map((r) => (
              <div className="card" key={r.key}>
                <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>
                  {REGION_LABELS[r.key] || r.key}
                </h3>
                <p className="kpi-sub">Intentions: {r.intentions || 0}</p>
                <p className="kpi-sub">Enrolments: {r.enrolments || 0}</p>
                <p className="kpi-sub">
                  B-less: <LossValue value={r.bless || 0} />
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      <UnclassifiedVenues venues={venues} />
    </div>
  );
}

function MetricKpis({ intentions, enrolments, bless, note }) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <p className="kpi-label">Intentions</p>
        <div className="kpi-value">{intentions ?? "—"}</div>
        {intentions == null && <p className="kpi-sub">{note}</p>}
      </div>
      <div className="kpi-card">
        <p className="kpi-label">Enrolments</p>
        <div className="kpi-value">{enrolments ?? "—"}</div>
        {enrolments == null && <p className="kpi-sub">{note}</p>}
      </div>
      <div className="kpi-card">
        <p className="kpi-label">B-less (players lost)</p>
        <div className="kpi-value">{bless == null ? "—" : <LossValue value={bless} />}</div>
        {bless == null && <p className="kpi-sub">{note}</p>}
      </div>
    </div>
  );
}

// A real calendar date picker instead of scrolling a long table — pick any
// date within the range we have real data for and see that day's numbers.
function DailyPicker({ daily }) {
  const sorted = [...(daily || [])].sort((a, b) => (a.key < b.key ? -1 : 1));
  const min = sorted[0]?.key;
  const max = sorted[sorted.length - 1]?.key;
  const [date, setDate] = useState(max || "");

  if (!min) {
    return (
      <div className="empty-state">
        No daily data yet — this is computed from real submission timestamps by the nightly
        sync, and only appears once a sync has run successfully.
      </div>
    );
  }

  const entry = sorted.find((d) => d.key === date);

  return (
    <div>
      <input
        className="date-input"
        type="date"
        min={min}
        max={max}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div style={{ marginTop: "1.25rem" }}>
        <MetricKpis
          intentions={entry ? entry.intentions : 0}
          enrolments={entry ? entry.enrolments : 0}
          bless={entry ? entry.bless : 0}
        />
      </div>
      {!entry && date && (
        <p className="kpi-sub" style={{ marginTop: "0.75rem" }}>
          No submissions recorded for this date.
        </p>
      )}
    </div>
  );
}

// Weeks are naturally few enough (a season is ~52) for a dropdown rather
// than a calendar widget — pick one, see that week's numbers.
function WeeklyPicker({ weekly }) {
  const sorted = [...(weekly || [])].sort((a, b) => (a.key < b.key ? -1 : 1));
  const [key, setKey] = useState(sorted[sorted.length - 1]?.key || "");

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        No weekly data yet — computed from real submission timestamps once a sync has run
        successfully.
      </div>
    );
  }

  const entry = sorted.find((w) => w.key === key);

  return (
    <div>
      <select className="date-input" value={key} onChange={(e) => setKey(e.target.value)}>
        {sorted.map((w) => (
          <option key={w.key} value={w.key}>
            {w.label}
          </option>
        ))}
      </select>
      <div style={{ marginTop: "1.25rem" }}>
        <MetricKpis
          intentions={entry?.intentions ?? 0}
          enrolments={entry?.enrolments ?? 0}
          bless={entry?.bless ?? 0}
        />
      </div>
    </div>
  );
}

// 12 months for a season is few enough for pills rather than a dropdown.
function MonthPicker({ months }) {
  const [key, setKey] = useState(
    [...months].reverse().find((m) => m.intentions != null)?.key || months[0]?.key || ""
  );
  const entry = months.find((m) => m.key === key);

  return (
    <div>
      <div className="name-pill-list">
        {months.map((m) => (
          <button
            key={m.key}
            className={`name-pill${key === m.key ? " active" : ""}`}
            onClick={() => setKey(m.key)}
            type="button"
          >
            {m.label}
          </button>
        ))}
      </div>
      {entry && (
        <div style={{ marginTop: "1.25rem" }}>
          <MetricKpis
            intentions={entry.intentions}
            enrolments={entry.enrolments}
            bless={entry.bless}
            note="Not started yet / no sync"
          />
        </div>
      )}
    </div>
  );
}

function formatPausedDate(iso) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function monthLabelOf(key) {
  const [year, month] = key.split("-");
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Buckets each paused player by the calendar month of their pausedAt date
// (real, per-player — see pausedPlayersOf in lib/aggregate.js), most recent
// month first, each player sorted newest-first within their month.
function groupPausedByMonth(pausedPlayers) {
  const byMonth = new Map();
  for (const p of pausedPlayers || []) {
    const key = p.pausedAt.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(p);
  }
  return [...byMonth.entries()]
    .map(([key, players]) => ({
      key,
      label: monthLabelOf(key),
      players: [...players].sort((a, b) => (a.pausedAt < b.pausedAt ? 1 : -1)),
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

// Players currently paused (see pausedPlayersOf in lib/aggregate.js) —
// distinct from B-less, which only counts a real "End my membership".
// Grouped by the month they paused in, since that's naturally how someone
// would look this up ("who paused in August?") — click a month to see that
// month's names, same pill pattern as By-month above.
function PausedPlayers({ pausedPlayers }) {
  const months = groupPausedByMonth(pausedPlayers);
  const [selectedKey, setSelectedKey] = useState(months[0]?.key || "");
  const [query, setQuery] = useState("");

  if (months.length === 0) {
    return <div className="empty-state">No currently paused players.</div>;
  }

  const selected = months.find((m) => m.key === selectedKey) || months[0];
  const filtered = query
    ? selected.players.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : selected.players;

  return (
    <div>
      <p className="section-subtitle">
        Each player&apos;s most recent B-less-form submission where they selected &quot;Pause
        Account&quot; without also ending their membership, grouped by the month they paused in.
        The form has no separate &quot;back from pause&quot; signal, so a player only drops off
        this list once they submit the form again with &quot;End my membership&quot; — if
        someone has simply returned to sessions, this list won&apos;t know that on its own.
      </p>
      <div className="name-pill-list" style={{ marginBottom: "1.25rem" }}>
        {months.map((m) => (
          <button
            key={m.key}
            className={`name-pill${selected.key === m.key ? " active" : ""}`}
            onClick={() => {
              setSelectedKey(m.key);
              setQuery("");
            }}
            type="button"
          >
            {m.label} ({m.players.length})
          </button>
        ))}
      </div>
      <input
        className="name-search"
        type="text"
        placeholder={`Search paused players in ${selected.label}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Venue</th>
              <th>Region</th>
              <th>Paused since</th>
              <th>Reason given</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.venue || "—"}</td>
                <td>{REGION_LABELS[r.region] || r.region}</td>
                <td>{formatPausedDate(r.pausedAt)}</td>
                <td>{r.reason || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="kpi-sub">
                  No matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EnrolmentBoard({ data }) {
  const months = data.months || [];

  const seasonTotals = months.reduce(
    (acc, m) => {
      acc.intentions += m.intentions || 0;
      acc.enrolments += m.enrolments || 0;
      acc.bless += m.bless || 0;
      return acc;
    },
    { intentions: 0, enrolments: 0, bless: 0 }
  );

  const monthToDate = months
    .filter((m) => m.intentions != null || m.enrolments != null || m.bless != null)
    .slice(-1)[0];

  const topics = [
    {
      key: "month-to-date",
      label: "Month to date",
      description: monthToDate ? monthToDate.label : "No data yet",
      render: () =>
        monthToDate ? (
          <MetricKpis
            intentions={monthToDate.intentions}
            enrolments={monthToDate.enrolments}
            bless={monthToDate.bless}
          />
        ) : (
          <div className="empty-state">No Enrolment data yet — sync hasn&apos;t run.</div>
        ),
    },
    {
      key: "year-to-date",
      label: "Year to date",
      description: `Season ${data.seasonStart} – ${data.seasonEnd}`,
      render: () => (
        <MetricKpis
          intentions={seasonTotals.intentions}
          enrolments={seasonTotals.enrolments}
          bless={seasonTotals.bless}
        />
      ),
    },
    {
      key: "region",
      label: "By region",
      description: "Johannesburg vs. Cape Town extramural",
      render: () => (
        <RegionBreakdown
          regionTotals={data.regionTotals}
          regionTotalsMonthToDate={data.regionTotalsMonthToDate}
          unclassifiedVenues={data.unclassifiedVenues}
        />
      ),
    },
    {
      key: "trial-outcomes",
      label: "Trial outcomes",
      description: "What happened to every intention",
      render: () => <BreakdownList title="Trial outcomes" items={data.trialOutcomes || []} />,
    },
    {
      key: "paused-players",
      label: "Currently paused",
      description: "Players who paused their account — separate from B-less",
      render: () => <PausedPlayers pausedPlayers={data.pausedPlayers} />,
    },
    {
      key: "daily",
      label: "Daily",
      description: "Pick any date",
      render: () => <DailyPicker daily={data.daily} />,
    },
    {
      key: "weekly",
      label: "Weekly",
      description: "Pick any week",
      render: () => <WeeklyPicker weekly={data.weekly} />,
    },
    {
      key: "by-month",
      label: "By month",
      description: "Pick any month this season",
      render: () => <MonthPicker months={months} />,
    },
    {
      key: "compare",
      label: "Compare",
      description: "Any day, week, month or year",
      render: () => <PeriodCompare growth={data} />,
    },
  ];

  return <TopicBoard topics={topics} />;
}
