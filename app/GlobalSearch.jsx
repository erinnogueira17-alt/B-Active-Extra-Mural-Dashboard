"use client";

import { useState } from "react";

// A single search box on the landing page for jumping straight to a real
// school, coach, or paused player by name, instead of having to guess which
// board and topic they're filed under first. Matches against the same real
// per-school/per-coach roster data and paused-players list the Current
// State and Enrolment boards already use — no separate index to keep in
// sync. Each result links straight to its board; getting to the exact name
// from there is one more click (the board's own By-school/By-coach/
// Currently-paused picker), same as browsing there directly.
const REGION_LABELS = {
  jhb: "Johannesburg extramural",
  cpt: "Cape Town extramural",
  unclassified: "Unclassified",
};

function formatCurrency(n) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function formatPausedDate(iso) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

const MAX_RESULTS = 6;

export default function GlobalSearch({ currentState, growth, onNavigate }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const active = q.length >= 2;

  const schools = active
    ? (currentState.perSchool || []).filter((s) => (s.school || "").toLowerCase().includes(q)).slice(0, MAX_RESULTS)
    : [];
  const coaches = active
    ? (currentState.perCoach || []).filter((c) => (c.coach || "").toLowerCase().includes(q)).slice(0, MAX_RESULTS)
    : [];
  const paused = active
    ? (growth.pausedPlayers || []).filter((p) => (p.name || "").toLowerCase().includes(q)).slice(0, MAX_RESULTS)
    : [];
  const noResults = active && schools.length === 0 && coaches.length === 0 && paused.length === 0;

  return (
    <div>
      <input
        className="name-search"
        style={{ maxWidth: "520px" }}
        type="text"
        placeholder="Search schools, coaches, or paused players…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {noResults && (
        <p className="kpi-sub" style={{ marginTop: "1rem" }}>
          No matches for &quot;{query}&quot;.
        </p>
      )}

      {active && !noResults && (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {schools.length > 0 && (
            <div>
              <p className="section-subtitle">Schools</p>
              <div className="card-grid">
                {schools.map((s) => (
                  <div className="card" key={s.school}>
                    <h3 className="section-title" style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                      {s.school}
                    </h3>
                    <p className="kpi-sub">
                      {REGION_LABELS[s.section] || s.section || "—"} · Coach: {s.coach || "—"}
                    </p>
                    <p className="kpi-sub">
                      {s.paying.toLocaleString()} paying / {s.enrolled.toLocaleString()} enrolled ·{" "}
                      {formatCurrency(s.revenue)}
                    </p>
                  </div>
                ))}
              </div>
              <button
                className="back-link"
                style={{ marginTop: "0.75rem" }}
                onClick={() => onNavigate("current-state")}
                type="button"
              >
                Open Current State → By school
              </button>
            </div>
          )}

          {coaches.length > 0 && (
            <div>
              <p className="section-subtitle">Coaches</p>
              <div className="card-grid">
                {coaches.map((c) => (
                  <div className="card" key={c.coach}>
                    <h3 className="section-title" style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                      {c.coach}
                    </h3>
                    <p className="kpi-sub">{c.schools.toLocaleString()} schools</p>
                    <p className="kpi-sub">
                      {c.payingPlayers.toLocaleString()} paying / {c.enrolledPlayers.toLocaleString()} enrolled ·{" "}
                      {formatCurrency(c.revenue)}
                    </p>
                  </div>
                ))}
              </div>
              <button
                className="back-link"
                style={{ marginTop: "0.75rem" }}
                onClick={() => onNavigate("current-state")}
                type="button"
              >
                Open Current State → By coach
              </button>
            </div>
          )}

          {paused.length > 0 && (
            <div>
              <p className="section-subtitle">Currently paused</p>
              <div className="card-grid">
                {paused.map((p) => (
                  <div className="card" key={p.name}>
                    <h3 className="section-title" style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                      {p.name}
                    </h3>
                    <p className="kpi-sub">
                      {p.venue || "—"} · {REGION_LABELS[p.region] || p.region}
                    </p>
                    <p className="kpi-sub">
                      Paused since {formatPausedDate(p.pausedAt)}
                      {p.reason ? ` · ${p.reason}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <button
                className="back-link"
                style={{ marginTop: "0.75rem" }}
                onClick={() => onNavigate("enrolment")}
                type="button"
              >
                Open Enrolment → Currently paused
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
