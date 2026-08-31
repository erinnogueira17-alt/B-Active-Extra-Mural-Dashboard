"use client";

import { useState } from "react";
import TopicBoard from "./TopicBoard.jsx";

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
// capturing from today forward (see the History topic below).
function NetMovement({ growth }) {
  const months = (growth?.months || []).filter(
    (m) => m.enrolments != null || m.bless != null
  );
  if (months.length === 0) return <div className="empty-state">No data yet.</div>;

  const monthToDate = months[months.length - 1];
  const seasonNet = months.reduce(
    (acc, m) => acc + (m.enrolments || 0) - (m.bless || 0),
    0
  );
  const monthNet = (monthToDate.enrolments || 0) - (monthToDate.bless || 0);

  return (
    <div>
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
    </div>
  );
}

// Real snapshots only exist from the day this feature shipped forward — we
// never captured what the roster looked like before now, so this honestly
// shows however many real data points have accumulated so far rather than
// fabricating a longer history.
function History({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="empty-state">
        No history yet — this board now saves a real snapshot on every nightly sync, so
        "every month going back" will fill in with real data over the coming months.
      </div>
    );
  }

  return <HistoryTable history={history} />;
}

function HistoryTable({ history }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
  const RECENT = 8;
  const visible = expanded ? sorted : sorted.slice(0, RECENT);

  return (
    <div>
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
            {visible.map((h) => (
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
      {sorted.length > RECENT && (
        <button className="back-link" onClick={() => setExpanded((v) => !v)} type="button">
          {expanded ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}

// A searchable list of names only — no numbers lined up in a table.
// Clicking a name is the only way to see its numbers, which then replace
// the list rather than sitting alongside it, matching how boards and
// topics themselves work (click in to see detail, click back to browse).
function NamePicker({ backLabel, items, getLabel, renderDetail, searchPlaceholder }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  if (items.length === 0) {
    return <div className="empty-state">No data yet.</div>;
  }

  if (selected) {
    return (
      <div>
        <button className="back-link" onClick={() => setSelected(null)} type="button">
          ← Back to {backLabel}
        </button>
        <h3 className="section-title">{getLabel(selected)}</h3>
        {renderDetail(selected)}
      </div>
    );
  }

  const filtered = query
    ? items.filter((item) => getLabel(item).toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div>
      <input
        className="name-search"
        type="text"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="name-pill-list">
        {filtered.map((item) => (
          <button
            key={getLabel(item)}
            className="name-pill"
            onClick={() => setSelected(item)}
            type="button"
          >
            {getLabel(item)}
          </button>
        ))}
        {filtered.length === 0 && <p className="kpi-sub">No matches.</p>}
      </div>
    </div>
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

  const topics = [
    {
      key: "totals",
      label: "Totals",
      description: "Paying, non-paying, revenue, schools, coaches — right now",
      render: () => (
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
      ),
    },
    {
      key: "net-movement",
      label: "Net movement",
      description: "Enrolments minus B-less, month and year to date",
      render: () => <NetMovement growth={growth} />,
    },
    {
      key: "history",
      label: "History",
      description: "Real snapshots, one per nightly sync",
      render: () => <History history={history} />,
    },
    {
      key: "by-section",
      label: "By section",
      description: "Johannesburg vs. Cape Town",
      render: () =>
        sectionEntries.length === 0 ? (
          <div className="empty-state">No data yet.</div>
        ) : (
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
        ),
    },
    {
      key: "by-coach",
      label: "By coach",
      description: "Schools coached, revenue, players",
      render: () => (
        <NamePicker
          backLabel="coaches"
          items={data.perCoach}
          getLabel={(c) => c.coach}
          searchPlaceholder="Search coaches…"
          renderDetail={(c) => (
            <div className="kpi-grid">
              <div className="kpi-card">
                <p className="kpi-label">Schools</p>
                <div className="kpi-value">{c.schools}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Paying players</p>
                <div className="kpi-value">{c.payingPlayers.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Non-paying players</p>
                <div className="kpi-value">{c.sponsoredPlayers.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Enrolled players</p>
                <div className="kpi-value">{c.enrolledPlayers.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Revenue</p>
                <div className="kpi-value">{formatCurrency(c.revenue)}</div>
              </div>
            </div>
          )}
        />
      ),
    },
    {
      key: "by-school",
      label: "By school",
      description: "Search and click a school for its numbers",
      render: () => (
        <NamePicker
          backLabel="schools"
          items={data.perSchool}
          getLabel={(s) => s.school}
          searchPlaceholder="Search schools…"
          renderDetail={(s) => (
            <div className="kpi-grid">
              <div className="kpi-card">
                <p className="kpi-label">Section</p>
                <div className="kpi-value" style={{ fontSize: "1.2rem" }}>
                  {SECTION_LABELS[s.section] || s.section || "—"}
                </div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Coach</p>
                <div className="kpi-value" style={{ fontSize: "1.2rem" }}>{s.coach || "—"}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Paying players</p>
                <div className="kpi-value">{s.paying.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Non-paying players</p>
                <div className="kpi-value">{(s.sponsored || 0).toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Enrolled players</p>
                <div className="kpi-value">{s.enrolled.toLocaleString()}</div>
              </div>
              <div className="kpi-card">
                <p className="kpi-label">Revenue</p>
                <div className="kpi-value">{formatCurrency(s.revenue)}</div>
              </div>
            </div>
          )}
        />
      ),
    },
  ];

  return <TopicBoard topics={topics} />;
}
