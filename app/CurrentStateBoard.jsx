"use client";

// Football/Soccer is intentionally absent here — the business only wants
// Johannesburg/Cape Town extramural on this board, and aggregateCurrentState
// already excludes the roster's "soccer" section rows before this ever
// renders, so no "soccer" entry should exist to label.
const SECTION_LABELS = {
  jhb: "Johannesburg",
  cpt: "Cape Town",
  unspecified: "Unspecified section",
};

function formatCurrency(n) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Net roster movement (Enrolments minus B-less) for the latest known month
// and for the season to date — this is real data we already have (from the
// same Intentions/Enrolments/B-less sync that drives the Enrolment board),
// unlike an actual historical Current State snapshot, which we only start
// capturing from today forward (see the History section below).
function NetMovement({ growth }) {
  const months = (growth?.months || []).filter(
    (m) => m.enrolments != null || m.bless != null
  );
  if (months.length === 0) return null;

  const monthToDate = months[months.length - 1];
  const seasonNet = months.reduce(
    (acc, m) => acc + (m.enrolments || 0) - (m.bless || 0),
    0
  );
  const monthNet = (monthToDate.enrolments || 0) - (monthToDate.bless || 0);

  return (
    <section className="section">
      <h2 className="section-title">Net movement</h2>
      <p className="section-subtitle">Enrolments minus B-less, Johannesburg &amp; Cape Town extramural</p>
      <div className="kpi-grid">
        <div className="kpi-card">
          <p className="kpi-label">Month to date ({monthToDate.label})</p>
          <div className="kpi-value">
            {monthNet > 0 ? "+" : ""}
            {monthNet}
          </div>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Year to date</p>
          <div className="kpi-value">
            {seasonNet > 0 ? "+" : ""}
            {seasonNet}
          </div>
          <p className="kpi-sub">
            {growth.seasonStart} – {growth.seasonEnd}
          </p>
        </div>
      </div>
    </section>
  );
}

// Real snapshots only exist from the day this feature shipped forward — we
// never captured what the roster looked like before now, so this honestly
// shows however many real data points have accumulated so far rather than
// fabricating a longer history.
function History({ history }) {
  if (!history || history.length === 0) {
    return (
      <section className="section">
        <h2 className="section-title">History</h2>
        <div className="empty-state">
          No history yet — this board now saves a real snapshot on every nightly sync, so
          "every month going back" will fill in with real data over the coming months.
        </div>
      </section>
    );
  }

  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="section">
      <h2 className="section-title">History</h2>
      <p className="section-subtitle">
        Real snapshots taken at each nightly sync — accumulates from today forward.
      </p>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Paying</th>
              <th>Non-paying</th>
              <th>Enrolled</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => (
              <tr key={h.date}>
                <td>{formatDate(h.date)}</td>
                <td>{h.totals.payingPlayers}</td>
                <td>{h.totals.sponsoredPlayers}</td>
                <td>{h.totals.enrolledPlayers}</td>
                <td>{formatCurrency(h.totals.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CurrentStateBoard({ data, growth, history }) {
  if (!data.parsed) {
    return (
      <div className="section">
        <h2 className="section-title">Current State</h2>
        <div className="empty-state">
          No Current State data yet — {data.reason || "sync hasn't run"}.
        </div>
      </div>
    );
  }

  const sectionEntries = Object.entries(data.sections || {});
  const sponsoredPct = data.totals.enrolledPlayers
    ? Math.round((data.totals.sponsoredPlayers / data.totals.enrolledPlayers) * 1000) / 10
    : 0;

  return (
    <div>
      <section className="section department-block">
        <h2 className="section-title">Current State</h2>
        <p className="section-subtitle">Johannesburg &amp; Cape Town extramural roster — right now</p>
      </section>

      <section className="section">
        <h2 className="section-title">Totals</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-label">Paying players</p>
            <div className="kpi-value">{data.totals.payingPlayers.toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Non-paying players</p>
            <div className="kpi-value">{data.totals.sponsoredPlayers.toLocaleString()}</div>
            <p className="kpi-sub">{sponsoredPct}% of enrolled players (fully sponsored)</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Enrolled players</p>
            <div className="kpi-value">{data.totals.enrolledPlayers.toLocaleString()}</div>
            <p className="kpi-sub">Paying + non-paying</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Revenue</p>
            <div className="kpi-value">{formatCurrency(data.totals.revenue)}</div>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Schools</p>
            <div className="kpi-value">{data.totals.schools.toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Coaches</p>
            <div className="kpi-value">{data.totals.coaches.toLocaleString()}</div>
          </div>
        </div>
      </section>

      <NetMovement growth={growth} />
      <History history={history} />

      {sectionEntries.length > 0 && (
        <section className="section">
          <h2 className="section-title">By section</h2>
          <div className="card-grid">
            {sectionEntries.map(([key, s]) => {
              const pct = s.enrolledPlayers
                ? Math.round((s.sponsoredPlayers / s.enrolledPlayers) * 1000) / 10
                : 0;
              return (
                <div className="card" key={key}>
                  <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>
                    {SECTION_LABELS[key] || key}
                  </h3>
                  <p className="kpi-sub">Paying players: {s.payingPlayers.toLocaleString()}</p>
                  <p className="kpi-sub">
                    Non-paying players: {s.sponsoredPlayers.toLocaleString()} ({pct}%)
                  </p>
                  <p className="kpi-sub">Enrolled players: {s.enrolledPlayers.toLocaleString()}</p>
                  <p className="kpi-sub">Revenue: {formatCurrency(s.revenue)}</p>
                  <p className="kpi-sub">Schools: {s.schools}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">By coach</h2>
        {data.perCoach.length === 0 ? (
          <div className="empty-state">No per-coach data yet.</div>
        ) : (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Schools</th>
                  <th>Paying</th>
                  <th>Non-paying</th>
                  <th>Enrolled</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.perCoach.map((c) => (
                  <tr key={c.coach}>
                    <td>{c.coach}</td>
                    <td>{c.schools}</td>
                    <td>{c.payingPlayers}</td>
                    <td>{c.sponsoredPlayers}</td>
                    <td>{c.enrolledPlayers}</td>
                    <td>{formatCurrency(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">By school</h2>
        {data.perSchool.length === 0 ? (
          <div className="empty-state">No per-school data yet.</div>
        ) : (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Section</th>
                  <th>Coach</th>
                  <th>Paying</th>
                  <th>Non-paying</th>
                  <th>Enrolled</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.perSchool.map((s) => (
                  <tr key={s.school}>
                    <td>{s.school}</td>
                    <td>{SECTION_LABELS[s.section] || s.section || "—"}</td>
                    <td>{s.coach || "—"}</td>
                    <td>{s.paying}</td>
                    <td>{s.sponsored || 0}</td>
                    <td>{s.enrolled}</td>
                    <td>{formatCurrency(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
