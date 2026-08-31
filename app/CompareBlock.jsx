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

// Lets a person choose the granularity (day/week/month/year) and then any
// two periods at that granularity to compare — not just the latest pair.
// Year is included for completeness but always shows the honest
// "not yet available" note, since only one season of history exists.
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
        <div className="unavailable-note">
          Not yet available — only one season of history exists. This view will be added once a
          second season's data exists, rather than being faked or hidden.
        </div>
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
