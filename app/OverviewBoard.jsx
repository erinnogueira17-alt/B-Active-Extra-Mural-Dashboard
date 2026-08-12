function formatCurrency(n) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

function latestKnownMonth(months) {
  const known = (months || []).filter((m) => m.intentions != null || m.enrolments != null || m.bless != null);
  return known.length > 0 ? known[known.length - 1] : null;
}

export default function OverviewBoard({ growth, currentState, onNavigate }) {
  const cs = currentState.data;
  const g = growth.data;
  const latestMonth = latestKnownMonth(g.months);

  return (
    <div>
      <section className="section">
        <h2 className="section-title">Current State, at a glance</h2>
        {cs.parsed === false ? (
          <div className="empty-state">
            No Current State data yet — {cs.reason || "sync hasn't run"}.
          </div>
        ) : (
          <div className="kpi-grid">
            <div className="kpi-card">
              <p className="kpi-label">Paying players</p>
              <div className="kpi-value">{cs.totals.payingPlayers.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Revenue</p>
              <div className="kpi-value">{formatCurrency(cs.totals.revenue)}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Schools</p>
              <div className="kpi-value">{cs.totals.schools.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Coaches</p>
              <div className="kpi-value">{cs.totals.coaches.toLocaleString()}</div>
            </div>
          </div>
        )}
        <div className="link-row">
          <button className="link-button" onClick={() => onNavigate("current-state")} type="button">
            Open Current State board →
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Enrolment funnel, at a glance</h2>
        {latestMonth ? (
          <>
            <p className="section-subtitle">Most recent month with data: {latestMonth.label}</p>
            <div className="kpi-grid">
              <div className="kpi-card">
                <p className="kpi-label">Intentions</p>
                <div className="kpi-value">{latestMonth.intentions ?? "—"}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Enrolments</p>
                <div className="kpi-value">{latestMonth.enrolments ?? "—"}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">B-less</p>
                <div className="kpi-value">{latestMonth.bless ?? "—"}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">No Enrolment data yet — sync hasn't run.</div>
        )}
        <div className="link-row">
          <button className="link-button" onClick={() => onNavigate("enrolment")} type="button">
            Open Enrolment board →
          </button>
        </div>
      </section>
    </div>
  );
}
