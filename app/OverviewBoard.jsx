"use client";

import { useState } from "react";
import CompareBlock, { buildComparison } from "./CompareBlock.jsx";

function formatCurrency(n) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(
    n || 0
  );
}

function latestKnownMonth(months) {
  const known = (months || []).filter((m) => m.intentions != null || m.enrolments != null || m.bless != null);
  return known.length > 0 ? known[known.length - 1] : null;
}

// A "Compare any two months" tool for the season's real monthly data —
// separate from EnrolmentBoard's fixed latest-vs-previous Compare tab,
// this lets a person pick any two months from the season (not just the
// most recent pair) to compare Intentions/Enrolments/B-less.
function AnyMonthCompare({ months }) {
  const known = (months || []).filter((m) => m.intentions != null || m.enrolments != null || m.bless != null);
  const [aKey, setAKey] = useState(known[0]?.key || "");
  const [bKey, setBKey] = useState(known[known.length - 1]?.key || "");

  if (known.length < 2) {
    return (
      <div className="section">
        <h3 className="section-title">Compare any two months</h3>
        <div className="empty-state">Not enough months with data yet to compare.</div>
      </div>
    );
  }

  const monthA = known.find((m) => m.key === aKey) || known[0];
  const monthB = known.find((m) => m.key === bKey) || known[known.length - 1];
  const comparison = buildComparison(monthA, monthB);

  return (
    <div className="section">
      <h3 className="section-title">Compare any two months</h3>
      <div className="compare-picker-row">
        <label>
          Month A
          <select value={aKey} onChange={(e) => setAKey(e.target.value)}>
            {known.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Month B
          <select value={bKey} onChange={(e) => setBKey(e.target.value)}>
            {known.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <CompareBlock title="Intentions, Enrolments &amp; B-less" comparison={comparison} />
    </div>
  );
}

export default function OverviewBoard({ growth, currentState, onNavigate }) {
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

  return (
    <div>
      <section className="section department-block">
        <h2 className="section-title">Current State, at a glance</h2>
        <p className="section-subtitle">Johannesburg &amp; Cape Town extramural roster — right now</p>
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
        )}
        <div className="link-row">
          <button className="link-button" onClick={() => onNavigate("current-state")} type="button">
            Open Current State board →
          </button>
        </div>
      </section>

      <section className="section department-block">
        <h2 className="section-title">Enrolment funnel, at a glance</h2>
        <p className="section-subtitle">Intentions, Enrolments &amp; B-less — season to date</p>
        {latestMonth ? (
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
            <p className="section-subtitle">Year to date: {g.seasonStart} – {g.seasonEnd}</p>
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
          <div className="empty-state">No Enrolment data yet — sync hasn't run.</div>
        )}
        <div className="link-row">
          <button className="link-button" onClick={() => onNavigate("enrolment")} type="button">
            Open Enrolment board →
          </button>
        </div>
      </section>

      <section className="section department-block">
        <h2 className="section-title">Comparisons</h2>
        <p className="section-subtitle">
          Intentions, Enrolments &amp; B-less — compare any month, or year on year.
        </p>
        <AnyMonthCompare months={g.months} />
        <div className="section">
          <h3 className="section-title">Year on year</h3>
          <div className="unavailable-note">
            Not yet available — only one season of history exists ({g.seasonStart} – {g.seasonEnd}).
            This view will be added once a second season's data exists, rather than being faked or
            hidden.
          </div>
        </div>
      </section>
    </div>
  );
}
