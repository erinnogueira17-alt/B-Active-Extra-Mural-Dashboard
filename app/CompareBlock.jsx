"use client";

import { useState } from "react";

// Shared by EnrolmentBoard and OverviewBoard so both render comparisons
// identically instead of maintaining two copies of the same markup.

const METRICS = [
  { key: "intentions", label: "Intentions" },
  { key: "enrolments", label: "Enrolments" },
  { key: "bless", label: "B-less" },
];

// Builds the {previous, current, deltas} shape CompareBlock expects from
// any two period entries (each needs a `label` plus the metric keys above).
// Order is whatever the caller passes — "previous"/"current" here just mean
// "left column"/"right column", not necessarily chronological order.
export function buildComparison(previous, current) {
  if (!previous || !current) return null;
  const deltas = {};
  for (const { key } of METRICS) {
    const prev = previous[key] ?? 0;
    const curr = current[key] ?? 0;
    deltas[key] = {
      delta: curr - prev,
      pct: prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10,
    };
  }
  return { previous, current, deltas };
}

export function BreakdownList({ title, items }) {
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

const GRANULARITIES = [
  { key: "daily", label: "Day", dataKey: "daily" },
  { key: "weekly", label: "Week", dataKey: "weekly" },
  { key: "monthly", label: "Month", dataKey: "months" },
  { key: "yearly", label: "Year", dataKey: null },
];

function periodsFor(growth, granularityKey) {
  const g = GRANULARITIES.find((x) => x.key === granularityKey);
  if (!g || !g.dataKey) return [];
  return (growth[g.dataKey] || []).filter(
    (p) => p.intentions != null || p.enrolments != null || p.bless != null
  );
}

// "Year" isn't a two-period comparison like the others — there's only one
// calendar year (the season itself) of data, so there's nothing to compare
// it against. Instead it's a running year-to-date tracker: cumulative
// totals built up month by month, so you can watch the year add up over
// time rather than seeing an artificial "vs" that has nothing real on the
// other side.
function YearlyTracker({ growth }) {
  const months = (growth.months || []).filter(
    (m) => m.intentions != null || m.enrolments != null || m.bless != null
  );
  if (months.length === 0) {
    return <div className="empty-state">No data yet this year.</div>;
  }

  let running = { intentions: 0, enrolments: 0, bless: 0 };
  const rows = months.map((m) => {
    running = {
      intentions: running.intentions + (m.intentions || 0),
      enrolments: running.enrolments + (m.enrolments || 0),
      bless: running.bless + (m.bless || 0),
    };
    return { key: m.key, label: m.label, ...running };
  });

  return (
    <div className="section">
      <h3 className="section-title">Year-to-date tracker</h3>
      <p className="section-subtitle">
        Running totals for Intentions, Enrolments & B-less, cumulative month by month
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Intentions</th>
              <th>Enrolments</th>
              <th>B-less</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{r.intentions}</td>
                <td>{r.enrolments}</td>
                <td>{r.bless}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pctChange(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function DeltaPct({ pct }) {
  if (pct == null) return null;
  const cls = pct > 0 ? "delta-positive" : pct < 0 ? "delta-negative" : "delta-neutral";
  return (
    <span className={cls} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
      ({pct > 0 ? "+" : ""}
      {pct}%)
    </span>
  );
}

// Each month's own totals (not cumulative, unlike YearlyTracker above),
// with % change from the month before it — so a growing or shrinking trend
// is visible directly across the whole year instead of only picking two
// specific months to compare via the Month granularity above.
export function GrowthTracker({ growth }) {
  const months = (growth.months || []).filter(
    (m) => m.intentions != null || m.enrolments != null || m.bless != null
  );
  if (months.length === 0) {
    return <div className="empty-state">No data yet this year.</div>;
  }

  return (
    <div className="section">
      <h3 className="section-title">Month-on-month growth</h3>
      <p className="section-subtitle">
        Each month&apos;s own totals for Intentions, Enrolments &amp; B-less, with % change
        from the month before
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Intentions</th>
              <th>Enrolments</th>
              <th>B-less</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => {
              const prev = i > 0 ? months[i - 1] : null;
              return (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  {METRICS.map(({ key }) => {
                    const curr = m[key] ?? 0;
                    const pct = prev ? pctChange(curr, prev[key] ?? 0) : null;
                    return (
                      <td key={key}>
                        {curr}
                        <DeltaPct pct={pct} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Lets a person choose the granularity (day/week/month/year) and then any
// two periods at that granularity to compare — not just the latest pair.
// Year is a running tracker instead (see YearlyTracker above), since a
// two-period "vs" comparison has nothing real on the other side yet.
export function PeriodCompare({ growth }) {
  const [granularity, setGranularity] = useState("monthly");
  const periods = periodsFor(growth, granularity);
  const [aKey, setAKey] = useState(periods[0]?.key || "");
  const [bKey, setBKey] = useState(periods[periods.length - 1]?.key || "");

  function selectGranularity(key) {
    setGranularity(key);
    const p = periodsFor(growth, key);
    setAKey(p[0]?.key || "");
    setBKey(p[p.length - 1]?.key || "");
  }

  const activeLabel = GRANULARITIES.find((g) => g.key === granularity).label;

  return (
    <div>
      <div className="granularity-row">
        {GRANULARITIES.map((g) => (
          <button
            key={g.key}
            className={`board-nav-item${granularity === g.key ? " active" : ""}`}
            onClick={() => selectGranularity(g.key)}
            type="button"
          >
            {g.label}
          </button>
        ))}
      </div>

      {granularity === "yearly" ? (
        <YearlyTracker growth={growth} />
      ) : periods.length < 2 ? (
        <div className="empty-state">
          Not enough {activeLabel.toLowerCase()}s with data yet to compare.
        </div>
      ) : (
        <>
          <div className="compare-picker-row">
            <label>
              {activeLabel} A
              <select value={aKey} onChange={(e) => setAKey(e.target.value)}>
                {periods.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {activeLabel} B
              <select value={bKey} onChange={(e) => setBKey(e.target.value)}>
                {periods.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <CompareBlock
            title="Intentions, Enrolments & B-less"
            comparison={buildComparison(
              periods.find((p) => p.key === aKey),
              periods.find((p) => p.key === bKey)
            )}
          />
        </>
      )}
    </div>
  );
}

export default function CompareBlock({ title, comparison }) {
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
