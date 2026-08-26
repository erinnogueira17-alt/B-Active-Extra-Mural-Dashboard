"use client";

const SECTION_LABELS = {
  jhb: "Johannesburg",
  cpt: "Cape Town",
  soccer: "Soccer",
  unspecified: "Unspecified section",
};

function formatCurrency(n) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

export default function CurrentStateBoard({ data }) {
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
      <section className="section">
        <h2 className="section-title">Totals</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-label">Paying players</p>
            <div className="kpi-value">{data.totals.payingPlayers.toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Sponsored players</p>
            <div className="kpi-value">{data.totals.sponsoredPlayers.toLocaleString()}</div>
            <p className="kpi-sub">{sponsoredPct}% of enrolled players</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Enrolled players</p>
            <div className="kpi-value">{data.totals.enrolledPlayers.toLocaleString()}</div>
            <p className="kpi-sub">Paying + sponsored</p>
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
                    Sponsored players: {s.sponsoredPlayers.toLocaleString()} ({pct}%)
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
                  <th>Sponsored</th>
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
                  <th>Sponsored</th>
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
