"use client";

import { PeriodCompare } from "./CompareBlock.jsx";
import TopicBoard from "./TopicBoard.jsx";

function formatCurrency(n) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

function latestKnownMonth(months) {
  const known = (months || []).filter((m) => m.intentions != null || m.enrolments != null || m.bless != null);
  return known.length > 0 ? known[known.length - 1] : null;
}

export default function OverviewBoard({ growth, currentState }) {
  const cs = currentState.data;
  const g = growth.data;
  const latestMonth = latestKnownMonth(g.months);

  const seasonTotals = (g.months || []).reduce(
    (acc, m) => {
      acc.intentions += m.intentions || 0;
      acc.enrolments += m.enrolments || 0;
      acc.bless += m.bless || 0;
      return acc;
    },
    { intentions: 0, enrolments: 0, bless: 0 }
  );

  const topics = [
    {
      key: "current-state",
      label: "Current State, at a glance",
      description: "Johannesburg & Cape Town extramural roster — right now",
      render: () =>
        cs.parsed === false ? (
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
              <p className="kpi-label">Non-paying players</p>
              <div className="kpi-value">{cs.totals.sponsoredPlayers.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Revenue</p>
              <div className="kpi-value">{formatCurrency(cs.totals.revenue)}</div>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Schools</p>
              <div className="kpi-value">{cs.totals.schools.toLocaleString()}</div>
            </div>
          </div>
        ),
    },
    {
      key: "enrolment-glance",
      label: "Enrolment funnel, at a glance",
      description: "Intentions, Enrolments & B-less — season to date",
      render: () =>
        latestMonth ? (
          <>
            <p className="section-subtitle">Month to date: {latestMonth.label}</p>
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
            <p className="section-subtitle" style={{ marginTop: "1.5rem" }}>
              Year to date: {g.seasonStart} – {g.seasonEnd}
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
          </>
        ) : (
          <div className="empty-state">No Enrolment data yet — sync hasn&apos;t run.</div>
        ),
    },
    {
      key: "comparisons",
      label: "Comparisons",
      description: "Intentions, Enrolments & B-less — any day, week, month or year",
      render: () => <PeriodCompare growth={g} />,
    },
  ];

  return <TopicBoard topics={topics} />;
}
