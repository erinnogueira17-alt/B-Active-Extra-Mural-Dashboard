"use client";

// Shared by EnrolmentBoard (fixed latest-vs-previous comparisons) and
// OverviewBoard (arbitrary any-two-months comparisons) so both render
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
