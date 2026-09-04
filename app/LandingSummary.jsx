// The landing page's basic-information layer: no drill-down, no lists —
// just the day/month/year numbers for each metric plus the current
// roster split, all real data already computed by the nightly sync.
// Deeper detail (comparisons, per-school, daily calendar browsing, etc.)
// lives one click down in the board tiles below this.

// South Africa Standard Time is a fixed UTC+2 year-round (no DST). Every
// row's __timestamp — and every daily/monthly key built from it in
// lib/aggregate.js — stores the sheet's own SAST wall-clock numbers *as if*
// they were UTC (a deliberate bucketing trick, see lib/aggregate.js). `now`
// here is a real clock instant (true UTC), so it needs the same +2h shift
// before reading its calendar date, or "today" would resolve to the wrong
// key for up to 2 hours around SAST midnight.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

function todayKey(now = new Date()) {
  return new Date(now.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
}

// Strictly today's real date — not "whichever day most recently had any
// activity". Falling back to an earlier day silently showed that day's
// total under a "Today" label, which reads as today's number when it isn't
// (e.g. showing 4 from yesterday's sheet rows when only 1 has come in
// today). If nothing has synced for today yet, this correctly shows 0
// rather than reusing a prior day's count.
function todaysEntry(daily) {
  const key = todayKey();
  return (daily || []).find((d) => d.key === key) || null;
}

function latestMonth(months) {
  const known = (months || []).filter(
    (m) => m.intentions != null || m.enrolments != null || m.bless != null
  );
  return known[known.length - 1] || null;
}

function seasonTotals(months) {
  return (months || []).reduce(
    (acc, m) => {
      acc.intentions += m.intentions || 0;
      acc.enrolments += m.enrolments || 0;
      acc.bless += m.bless || 0;
      return acc;
    },
    { intentions: 0, enrolments: 0, bless: 0 }
  );
}

function MetricRow({ title, metricKey, day, month, year }) {
  return (
    <div className="card">
      <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>
        {title}
      </h3>
      <div className="kpi-grid">
        <div className="kpi-card">
          <p className="kpi-label">Today</p>
          <div className="kpi-value">{day ? (day[metricKey] ?? 0) : 0}</div>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">This month</p>
          <div className="kpi-value">{month ? (month[metricKey] ?? "—") : "—"}</div>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">This season</p>
          <div className="kpi-value">{year[metricKey]}</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingSummary({ growth, currentState }) {
  const g = growth.data;
  const cs = currentState.data;

  const day = todaysEntry(g.daily);
  const month = latestMonth(g.months);
  const year = seasonTotals(g.months);

  const enrolledTotal = cs.parsed ? cs.totals.enrolledPlayers : 0;
  const paidPct = cs.parsed && enrolledTotal ? Math.round((cs.totals.payingPlayers / enrolledTotal) * 1000) / 10 : 0;
  const nonPayingPct = cs.parsed && enrolledTotal ? Math.round((cs.totals.sponsoredPlayers / enrolledTotal) * 1000) / 10 : 0;

  return (
    <div className="landing-summary">
      <div className="card">
        <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>
          Current roster
        </h3>
        {!cs.parsed ? (
          <div className="empty-state">No Current State data yet — {cs.reason || "sync hasn't run"}.</div>
        ) : (
          <div className="kpi-grid">
            <div className="kpi-card">
              <p className="kpi-label">Paid enrolments</p>
              <div className="kpi-value">{cs.totals.payingPlayers.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Total enrolments</p>
              <div className="kpi-value">{enrolledTotal.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">% paid</p>
              <div className="kpi-value">{paidPct}%</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">% non-paying</p>
              <div className="kpi-value">{nonPayingPct}%</div>
            </div>
          </div>
        )}
      </div>

      <div className="card-grid" style={{ marginTop: "1.25rem" }}>
        <MetricRow title="Enrolments" metricKey="enrolments" day={day} month={month} year={year} />
        <MetricRow title="B-less" metricKey="bless" day={day} month={month} year={year} />
        <MetricRow title="Intentions" metricKey="intentions" day={day} month={month} year={year} />
      </div>
    </div>
  );
}
