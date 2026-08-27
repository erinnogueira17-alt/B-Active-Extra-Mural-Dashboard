"use client";

import { useState } from "react";
import CompareBlock, { BreakdownList } from "./CompareBlock.jsx";

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
  if (!regionTotals) return null;
  const entries = REGION_ORDER.map((key) => ({ key, ...regionTotals[key] })).filter(
    (r) => (r.intentions || 0) + (r.enrolments || 0) + (r.bless || 0) > 0
  );
  if (entries.length === 0) return null;

  return (
    <section className="section">
      <h2 className="section-title">By region</h2>
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
    </section>
  );
}

// Daily/weekly breakdowns can run to hundreds of rows — show only the most
// recent ones by default, with a click to reveal the rest, instead of
// always rendering the full list.
function PeriodTable({ rows, periodLabel }) {
  const [expanded, setExpanded] = useState(false);
  const RECENT = 10;
  const mostRecentFirst = [...rows].reverse();
  const visible = expanded ? mostRecentFirst : mostRecentFirst.slice(0, RECENT);

  return (
    <>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>{periodLabel}</th>
              <th>Intentions</th>
              <th>Enrolments</th>
              <th>B-less</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.intentions}</td>
                <td>{row.enrolments}</td>
                <td>{row.bless}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > RECENT && (
        <button className="back-link" onClick={() => setExpanded((v) => !v)} type="button">
          {expanded ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </>
  );
}

export default function EnrolmentBoard({ data }) {
  const months = data.months || [];
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "compare", label: "Compare" },
    ...months.map((m) => ({ key: m.key, label: m.label })),
  ];
  const [tab, setTab] = useState("overview");

  const seasonTotals = months.reduce(
    (acc, m) => {
      acc.intentions += m.intentions || 0;
      acc.enrolments += m.enrolments || 0;
      acc.bless += m.bless || 0;
      return acc;
    },
    { intentions: 0, enrolments: 0, bless: 0 }
  );

  const activeMonth = months.find((m) => m.key === tab);
  const monthToDate = months
    .filter((m) => m.intentions != null || m.enrolments != null || m.bless != null)
    .slice(-1)[0];

  return (
    <div>
      <div className="tab-strip">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-pill${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <section className="section">
            <h2 className="section-title">Month to date</h2>
            <p className="section-subtitle">{monthToDate ? monthToDate.label : "No data yet"}</p>
            {monthToDate ? (
              <div className="kpi-grid">
                <div className="kpi-card">
                  <p className="kpi-label">Intentions</p>
                  <div className="kpi-value">{monthToDate.intentions ?? "—"}</div>
                </div>
                <div className="kpi-card">
                  <p className="kpi-label">Enrolments</p>
                  <div className="kpi-value">{monthToDate.enrolments ?? "—"}</div>
                </div>
                <div className="kpi-card">
                  <p className="kpi-label">B-less</p>
                  <div className="kpi-value">{monthToDate.bless ?? "—"}</div>
                </div>
              </div>
            ) : (
              <div className="empty-state">No Enrolment data yet — sync hasn&apos;t run.</div>
            )}
          </section>
          <section className="section">
            <h2 className="section-title">Year to date</h2>
            <p className="section-subtitle">
              Season {data.seasonStart} – {data.seasonEnd}
            </p>
            <div className="kpi-grid">
              <div className="kpi-card">
                <p className="kpi-label">Intentions</p>
                <div className="kpi-value">{seasonTotals.intentions}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Enrolments</p>
                <div className="kpi-value">{seasonTotals.enrolments}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">B-less</p>
                <div className="kpi-value">{seasonTotals.bless}</div>
              </div>
            </div>
          </section>
          <RegionBreakdown regionTotals={data.regionTotals} />
          <div className="card-grid">
            <BreakdownList title="Trial outcomes" items={data.trialOutcomes || []} />
            <BreakdownList title="B-less reasons" items={data.blessReasons || []} />
          </div>
        </>
      )}

      {tab === "daily" && (
        <section className="section">
          <h2 className="section-title">Daily breakdown</h2>
          {(data.daily || []).length === 0 ? (
            <div className="empty-state">
              No daily data yet — this is computed from real submission timestamps by the
              nightly sync, and only appears once a sync has run successfully.
            </div>
          ) : (
            <PeriodTable rows={data.daily} periodLabel="Date" />
          )}
        </section>
      )}

      {tab === "weekly" && (
        <section className="section">
          <h2 className="section-title">Weekly breakdown</h2>
          {(data.weekly || []).length === 0 ? (
            <div className="empty-state">
              No weekly data yet — computed from real submission timestamps once a sync has
              run successfully.
            </div>
          ) : (
            <PeriodTable rows={data.weekly} periodLabel="Week" />
          )}
        </section>
      )}

      {tab === "compare" && (
        <>
          <CompareBlock title="Month vs month" comparison={data.compare?.monthVsMonth} />
          <CompareBlock title="Week vs week" comparison={data.compare?.weekVsWeek} />
          <div className="section">
            <h3 className="section-title">Year over year</h3>
            <div className="unavailable-note">
              Not yet available — only one season of history exists (Nov 2025 – Nov 2026).
              This view will be added once a second season's data exists, rather than being
              faked or hidden.
            </div>
          </div>
        </>
      )}

      {activeMonth && (
        <section className="section">
          <h2 className="section-title">{activeMonth.label}</h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <p className="kpi-label">Intentions</p>
              <div className="kpi-value">{activeMonth.intentions ?? "—"}</div>
              {activeMonth.intentions == null && <p className="kpi-sub">Not started yet / no sync</p>}
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Enrolments</p>
              <div className="kpi-value">{activeMonth.enrolments ?? "—"}</div>
              {activeMonth.enrolments == null && <p className="kpi-sub">Not started yet / no sync</p>}
            </div>
            <div className="kpi-card">
              <p className="kpi-label">B-less</p>
              <div className="kpi-value">{activeMonth.bless ?? "—"}</div>
              {activeMonth.bless == null && <p className="kpi-sub">Not started yet / no sync</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
