"use client";

import { useState } from "react";

const METRICS = [
  { key: "intentions", label: "Intentions" },
  { key: "enrolments", label: "Enrolments" },
  { key: "bless", label: "B-less" },
];

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

function CompareBlock({ title, comparison }) {
  if (!comparison) {
    return (
      <div className="section">
        <h3 className="section-title">{title}</h3>
        <div className="empty-state">Not enough data yet to compare two periods.</div>
      </div>
    );
  }

  const { previous, current, deltas } = comparison;

  return (
    <div className="section">
      <h3 className="section-title">{title}</h3>
      <p className="section-subtitle">
        {previous.label} vs {current.label}
      </p>
      <div className="card">
        {METRICS.map(({ key, label }) => {
          const prevVal = previous[key] ?? 0;
          const currVal = current[key] ?? 0;
          const max = Math.max(prevVal, currVal, 1);
          const { delta, pct } = deltas[key];
          const deltaClass = delta > 0 ? "delta-positive" : delta < 0 ? "delta-negative" : "delta-neutral";
          return (
            <div className="compare-row" key={key}>
              <div className="compare-label">{label}</div>
              <div className="compare-bars">
                <div className="compare-bar-track">
                  <div
                    className="compare-bar-fill previous"
                    style={{ width: `${(prevVal / max) * 100}%` }}
                  />
                </div>
                <div className="compare-bar-track">
                  <div className="compare-bar-fill" style={{ width: `${(currVal / max) * 100}%` }} />
                </div>
              </div>
              <div className="compare-numbers">
                {prevVal} → {currVal}{" "}
                <span className={deltaClass}>
                  ({delta > 0 ? "+" : ""}
                  {delta}
                  {pct != null ? `, ${pct > 0 ? "+" : ""}${pct}%` : ""})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownList({ title, items }) {
  return (
    <div className="section">
      <h3 className="section-title">{title}</h3>
      {items.length === 0 ? (
        <div className="empty-state">No data yet.</div>
      ) : (
        <div className="card">
          {items.map((item) => (
            <div className="compare-row" key={item.label}>
              <div className="compare-label" style={{ width: "auto", flex: 1 }}>
                {item.label}
              </div>
              <div className="compare-numbers" style={{ width: "auto" }}>
                {item.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
            <h2 className="section-title">Season totals</h2>
            <p className="section-subtitle">
              {data.seasonStart} – {data.seasonEnd}
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
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Intentions</th>
                    <th>Enrolments</th>
                    <th>B-less</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((row) => (
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
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Intentions</th>
                    <th>Enrolments</th>
                    <th>B-less</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weekly.map((row) => (
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
