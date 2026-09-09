"use client";

import { useMemo, useState } from "react";
import TopicBoard from "./TopicBoard.jsx";
import {
  SCORECARD_CATEGORIES,
  RATING_OPTIONS,
  scoreRatings,
  currentWeekKey,
  currentMonthKey,
  formatPeriodLabel,
} from "../lib/scorecard.js";

function emptyRatings() {
  return Object.fromEntries(SCORECARD_CATEGORIES.map((c) => [c, 0]));
}

function formatPct(n) {
  return n == null ? "—" : `${Math.round(n * 1000) / 10}%`;
}

// Weekly/monthly period toggle plus the matching native picker — shared by
// both topics below via lifted state, so switching from "Enter scores" to
// "Team results" keeps looking at the same period instead of resetting it.
function PeriodPicker({ periodType, periodKey, onChangeType, onChangeKey }) {
  return (
    <div className="granularity-row">
      <button
        type="button"
        className={`board-nav-item${periodType === "weekly" ? " active" : ""}`}
        onClick={() => onChangeType("weekly", currentWeekKey())}
      >
        Weekly
      </button>
      <button
        type="button"
        className={`board-nav-item${periodType === "monthly" ? " active" : ""}`}
        onClick={() => onChangeType("monthly", currentMonthKey())}
      >
        Monthly
      </button>
      {periodType === "weekly" ? (
        <input
          className="date-input"
          type="week"
          value={periodKey}
          onChange={(e) => e.target.value && onChangeKey(e.target.value)}
        />
      ) : (
        <input
          className="date-input"
          type="month"
          value={periodKey}
          onChange={(e) => e.target.value && onChangeKey(e.target.value)}
        />
      )}
    </div>
  );
}

// Rate one coach for the selected period. Prefills from any existing entry
// for that exact coach+period so re-opening it is an edit, not a blank slate,
// and POSTs to /api/scorecard on save — the only user-written (not synced
// from the roster sheet) data in this app.
function EntryForm({ coaches, periodType, periodKey, entries, onSaved }) {
  const [coach, setCoach] = useState(coaches[0] || "");
  const [customCoach, setCustomCoach] = useState("");
  const [ratings, setRatings] = useState(() => {
    const existing = entries.find(
      (e) => e.periodType === periodType && e.periodKey === periodKey && e.coach === (coaches[0] || "")
    );
    return existing ? { ...emptyRatings(), ...existing.ratings } : emptyRatings();
  });
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  const activeCoach = coach === "__other__" ? customCoach.trim() : coach;

  function loadCoachPeriod(nextCoach, nextPeriodType, nextPeriodKey) {
    const existing = entries.find(
      (e) =>
        e.periodType === nextPeriodType && e.periodKey === nextPeriodKey && e.coach === nextCoach
    );
    setRatings(existing ? { ...emptyRatings(), ...existing.ratings } : emptyRatings());
    setStatus("idle");
  }

  function handleCoachChange(value) {
    setCoach(value);
    if (value !== "__other__") loadCoachPeriod(value, periodType, periodKey);
  }

  function handleRatingChange(category, value) {
    setRatings((r) => ({ ...r, [category]: Number(value) }));
    setStatus("idle");
  }

  const preview = useMemo(() => scoreRatings(ratings), [ratings]);

  async function handleSave() {
    if (!activeCoach) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach: activeCoach, periodType, periodKey, ratings }),
      });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Save failed");
      setStatus("saved");
      onSaved(body.entry);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <p className="section-subtitle">
        Rate {formatPeriodLabel(periodType, periodKey)} — pick a coach, set each category, then
        save. Re-opening the same coach and period loads whatever was last saved so you can edit
        it.
      </p>

      <div className="granularity-row" style={{ marginTop: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span className="kpi-label">Coach</span>
          {coaches.length > 0 ? (
            <select
              className="date-input"
              value={coach}
              onChange={(e) => handleCoachChange(e.target.value)}
            >
              {coaches.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__other__">Other (type a name)…</option>
            </select>
          ) : (
            <span className="kpi-sub">No coaches synced yet — type a name below.</span>
          )}
        </label>
        {(coaches.length === 0 || coach === "__other__") && (
          <input
            className="date-input"
            type="text"
            placeholder="Coach name"
            value={customCoach}
            onChange={(e) => {
              setCustomCoach(e.target.value);
              setStatus("idle");
            }}
          />
        )}
      </div>

      <div className="card-grid" style={{ marginTop: "1.5rem" }}>
        {SCORECARD_CATEGORIES.map((category) => (
          <label key={category} className="card" style={{ display: "block" }}>
            <span className="kpi-label" style={{ display: "block", marginBottom: "0.6rem" }}>
              {category}
            </span>
            <select
              className="date-input"
              style={{ width: "100%" }}
              value={ratings[category]}
              onChange={(e) => handleRatingChange(category, e.target.value)}
            >
              {RATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="kpi-grid" style={{ marginTop: "1.5rem" }}>
        <div className="kpi-card">
          <p className="kpi-label">Total</p>
          <div className="kpi-value">{preview.total}</div>
          <p className="kpi-sub">{preview.categoriesRated} of {SCORECARD_CATEGORIES.length} categories rated</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">% Score (rated only)</p>
          <div className="kpi-value">{formatPct(preview.pctRatedOnly)}</div>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">% Score (all categories)</p>
          <div className="kpi-value">{formatPct(preview.pctAllCategories)}</div>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Performance band</p>
          <div className="kpi-value" style={{ fontSize: "1.4rem" }}>{preview.band}</div>
        </div>
      </div>

      <button
        type="button"
        className="sync-now-button"
        style={{ marginTop: "1.5rem", fontSize: "0.95rem" }}
        onClick={handleSave}
        disabled={status === "saving" || !activeCoach}
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
          ? "Saved ✓"
          : status === "error"
          ? "Save failed — retry"
          : "Save score"}
      </button>
    </div>
  );
}

// Every coach already scored for the selected period, plus the team
// average — same shape as the workbook's own results table and Team
// Average row.
function ResultsTable({ entries, periodType, periodKey }) {
  const rows = entries
    .filter((e) => e.periodType === periodType && e.periodKey === periodKey)
    .sort((a, b) => a.coach.localeCompare(b.coach));

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        No scores saved yet for {formatPeriodLabel(periodType, periodKey)} — use "Enter / update
        scores" to add the first one.
      </div>
    );
  }

  const rated = rows.filter((r) => r.categoriesRated > 0);
  const teamAvgPct =
    rated.length > 0 ? rated.reduce((sum, r) => sum + r.pctRatedOnly, 0) / rated.length : null;

  return (
    <div>
      <p className="section-subtitle">{formatPeriodLabel(periodType, periodKey)}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Coach</th>
              <th>Total</th>
              <th>Categories rated</th>
              <th>% Score (rated only)</th>
              <th>% Score (all categories)</th>
              <th>Performance band</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.coach}>
                <td>{r.coach}</td>
                <td>{r.total}</td>
                <td>{r.categoriesRated} of {SCORECARD_CATEGORIES.length}</td>
                <td>{formatPct(r.pctRatedOnly)}</td>
                <td>{formatPct(r.pctAllCategories)}</td>
                <td>{r.band}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kpi-grid" style={{ marginTop: "1.5rem" }}>
        <div className="kpi-card">
          <p className="kpi-label">Team average (rated coaches only)</p>
          <div className="kpi-value">{formatPct(teamAvgPct)}</div>
          <p className="kpi-sub">{rated.length} of {rows.length} coaches rated this period</p>
        </div>
      </div>
    </div>
  );
}

export default function CoachScorecardBoard({ data, coaches }) {
  const [periodType, setPeriodType] = useState("weekly");
  const [periodKey, setPeriodKey] = useState(currentWeekKey());
  const [entries, setEntries] = useState(data.entries || []);

  function handleChangeType(nextType, nextKey) {
    setPeriodType(nextType);
    setPeriodKey(nextKey);
  }

  function handleSaved(entry) {
    setEntries((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
  }

  const topics = [
    {
      key: "enter-scores",
      label: "Enter / update scores",
      description: "Rate one coach against every category for the selected week or month",
      render: () => (
        <div>
          <PeriodPicker
            periodType={periodType}
            periodKey={periodKey}
            onChangeType={handleChangeType}
            onChangeKey={setPeriodKey}
          />
          <EntryForm
            coaches={coaches}
            periodType={periodType}
            periodKey={periodKey}
            entries={entries}
            onSaved={handleSaved}
          />
        </div>
      ),
    },
    {
      key: "team-results",
      label: "Team results",
      description: "Every coach scored so far this period, plus the team average",
      render: () => (
        <div>
          <PeriodPicker
            periodType={periodType}
            periodKey={periodKey}
            onChangeType={handleChangeType}
            onChangeKey={setPeriodKey}
          />
          <ResultsTable entries={entries} periodType={periodType} periodKey={periodKey} />
        </div>
      ),
    },
  ];

  return <TopicBoard topics={topics} />;
}
