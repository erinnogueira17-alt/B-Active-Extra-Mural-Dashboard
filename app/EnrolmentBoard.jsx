"use client";

import { useState } from "react";
import { BreakdownList, PeriodCompare } from "./CompareBlock.jsx";
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

function RegionBreakdown({ regionTotals }) {
  if (!regionTotals) return <div className="empty-state">No data yet.</div>;
  const entries = REGION_ORDER.map((key) => ({ key, ...regionTotals[key] })).filter(
    (r) => (r.intentions || 0) + (r.enrolments || 0) + (r.bless || 0) > 0
  );
  if (entries.length === 0) return <div className="empty-state">No data yet.</div>;

  return (
    <div>
      {entries.some((e) => e.key === "unclassified") && (
        <p className="section-subtitle">
          Unclassified rows are venues the sync couldn&apos;t confidently match to a known school —
          shown separately rather than guessed into the wrong region.
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
            <p className="kpi-sub">B-less: {r.bless || 0}</p>
          </div>
        ))}
      </div>
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
        <p className="kpi-label">B-less</p>
        <div className="kpi-value">{bless ?? "—"}</div>
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

// 13 months for a season is few enough for pills rather than a dropdown.
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
      render: () => <RegionBreakdown regionTotals={data.regionTotals} />,
    },
    {
      key: "trial-outcomes",
      label: "Trial outcomes",
      description: "What happened to every intention",
      render: () => <BreakdownList title="Trial outcomes" items={data.trialOutcomes || []} />,
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
