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

// One tile per coach — click through to see that coach's own score history
// across every period they've been rated, most recent first. Complements
// Team results (every coach, one period) with the other axis: one coach,
// every period. Coaches come from the union of the current roster and
// anyone with scorecard history but no longer on it, so past scores for a
// coach who's since left never just disappear from view.
function ByCoach({ coaches, entries }) {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const allNames = [...new Set([...(coaches || []), ...entries.map((e) => e.coach)])].sort((a, b) =>
    a.localeCompare(b)
  );

  if (allNames.length === 0) {
    return <div className="empty-state">No coaches yet.</div>;
  }

  if (selected) {
    const history = entries
      .filter((e) => e.coach === selected)
      .sort((a, b) => (a.periodKey < b.periodKey ? 1 : -1));

    return (
      <div>
        <button className="back-link" onClick={() => setSelected(null)} type="button">
          ← Back to coaches
        </button>
        <h3 className="section-title">{selected}</h3>
        {history.length === 0 ? (
          <div className="empty-state">No scores recorded yet for {selected}.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Total</th>
                  <th>Categories rated</th>
                  <th>% Score (rated only)</th>
                  <th>% Score (all categories)</th>
                  <th>Performance band</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{formatPeriodLabel(h.periodType, h.periodKey)}</td>
                    <td>{h.total}</td>
                    <td>
                      {h.categoriesRated} of {SCORECARD_CATEGORIES.length}
                    </td>
                    <td>{formatPct(h.pctRatedOnly)}</td>
                    <td>{formatPct(h.pctAllCategories)}</td>
                    <td>{h.band}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const filtered = query
    ? allNames.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : allNames;

  return (
    <div>
      <input
        className="name-search"
        type="text"
        placeholder="Search coaches…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="board-landing" style={{ marginTop: "1.25rem" }}>
        {filtered.map((name) => {
          const count = entries.filter((e) => e.coach === name).length;
          return (
            <button key={name} className="board-tile" onClick={() => setSelected(name)} type="button">
              <span className="board-tile-label">{name}</span>
              <span className="board-tile-desc">
                {count} period{count === 1 ? "" : "s"} scored
              </span>
              <span className="board-tile-arrow">Open →</span>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="empty-state">No matches.</div>}
      </div>
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

// Uploads a filled-in .xlsx report (one row per coach, the same 10
// category columns as "Enter / update scores") to /api/scorecard/import,
// which locates the header and coach rows by content the same way
// lib/currentStateAggregate.js already does for the roster sheet, then
// saves every coach it finds as their score for the selected period —
// same effect as entering them one by one, just from a file instead.
function ImportReport({ periodType, periodKey, onChangeType, onChangeKey, onImported }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("periodType", periodType);
      body.append("periodKey", periodKey);
      const res = await fetch("/api/scorecard/import", { method: "POST", body });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) throw new Error(data.error || "Import failed");
      setResult(data.updated);
      setStatus("done");
      onImported(data.updated);
    } catch (err) {
      setError(err.message || "Import failed");
      setStatus("error");
    }
  }

  return (
    <div>
      <p className="section-subtitle">
        Upload a filled-in report — one row per coach, with the same 10 category columns as
        &quot;Enter / update scores&quot; (the EM Performance Tracker template this board is
        modeled on works directly). Every coach row it finds is saved as their score for the
        period below, the same as entering them by hand — re-uploading for the same coach and
        period overwrites what was there.
      </p>
      <PeriodPicker
        periodType={periodType}
        periodKey={periodKey}
        onChangeType={onChangeType}
        onChangeKey={onChangeKey}
      />

      <div className="granularity-row" style={{ marginTop: "1rem" }}>
        <input
          className="date-input"
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setStatus("idle");
            setError("");
            setResult(null);
          }}
        />
        <button
          type="button"
          className="sync-now-button"
          style={{ fontSize: "0.95rem" }}
          onClick={handleUpload}
          disabled={!file || status === "uploading"}
        >
          {status === "uploading" ? "Uploading…" : "Import scores"}
        </button>
      </div>

      {status === "error" && (
        <p className="kpi-sub" style={{ marginTop: "1rem", color: "var(--negative)" }}>
          {error}
        </p>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-subtitle">
            Saved {result.length} coach{result.length === 1 ? "" : "es"} for{" "}
            {formatPeriodLabel(periodType, periodKey)}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Total</th>
                  <th>Categories rated</th>
                  <th>% Score (rated only)</th>
                  <th>Performance band</th>
                </tr>
              </thead>
              <tbody>
                {result.map((r) => (
                  <tr key={r.coach}>
                    <td>{r.coach}</td>
                    <td>{r.total}</td>
                    <td>
                      {r.categoriesRated} of {SCORECARD_CATEGORIES.length}
                    </td>
                    <td>{formatPct(r.pctRatedOnly)}</td>
                    <td>{r.band}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

  function handleImported(updatedEntries) {
    setEntries((prev) => {
      const ids = new Set(updatedEntries.map((e) => e.id));
      return [...prev.filter((e) => !ids.has(e.id)), ...updatedEntries];
    });
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
    {
      key: "by-coach",
      label: "By coach",
      description: "One tile per coach — click through for their full score history",
      render: () => <ByCoach coaches={coaches} entries={entries} />,
    },
    {
      key: "import-report",
      label: "Import from report",
      description: "Upload a filled-in .xlsx report to score a whole team at once",
      render: () => (
        <ImportReport
          periodType={periodType}
          periodKey={periodKey}
          onChangeType={handleChangeType}
          onChangeKey={setPeriodKey}
          onImported={handleImported}
        />
      ),
    },
  ];

  return <TopicBoard topics={topics} />;
}
