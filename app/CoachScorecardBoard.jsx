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

// Performance bands share a small, fixed, reserved color scale by severity
// (good/warning/serious/critical) rather than an arbitrary per-band hue —
// the same color always means the same thing everywhere a chart on this
// board shows a band, and it stays visually distinct from the app's own
// accent red. Excellent and Good share the "good" step; there's no real
// value in a fifth shade just to give every band its own color.
const BAND_ORDER = ["Excellent", "Good", "Satisfactory", "Needs Improvement", "Poor", "Not rated"];
const BAND_COLORS = {
  Excellent: "#0ca30c",
  Good: "#0ca30c",
  Satisfactory: "#fab219",
  "Needs Improvement": "#ec835a",
  Poor: "#d03b3b",
  "Not rated": "#a9a299",
};

function bandColor(band) {
  return BAND_COLORS[band] || "#a9a299";
}

function truncateLabel(s, max) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// A colored-dot key for whichever bands actually appear in the chart above
// it — never more than the six real bands, and never fewer than what's
// shown, so color is never asked to carry meaning alone.
function BandLegend({ bands }) {
  const present = BAND_ORDER.filter((b) => bands.has(b));
  if (present.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem", marginTop: "0.85rem" }}>
      {present.map((b) => (
        <span
          key={b}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)" }}
        >
          <span
            style={{ width: 10, height: 10, borderRadius: "50%", background: bandColor(b), flexShrink: 0 }}
          />
          {b}
        </span>
      ))}
    </div>
  );
}

// One bar per item, height = % Score (rated only), colored by performance
// band — used both to compare every coach for one period (Team results)
// and to compare one coach across every period (By coach), so "does this
// go up or down" reads the same way in both places. Only rated items plot
// (a null % has no bar height to draw); square baseline, rounded top per
// the bar mark spec, with the value directly labeled above each bar so no
// separate axis is needed.
function ScoreBarChart({ items, ariaLabel }) {
  const rated = items.filter((i) => i.pct != null);
  if (rated.length === 0) {
    return <div className="empty-state">Not enough rated scores yet to chart.</div>;
  }

  const SLOT = 60;
  const BAR_W = 24;
  const CHART_H = 170;
  const LABEL_H = 40;
  const width = rated.length * SLOT;
  const bandsPresent = new Set(rated.map((i) => i.band));

  return (
    <div>
      <div className="table-wrap">
        <svg
          width={width}
          height={CHART_H + LABEL_H}
          viewBox={`0 0 ${width} ${CHART_H + LABEL_H}`}
          role="img"
          aria-label={ariaLabel}
        >
          <line x1={0} y1={CHART_H} x2={width} y2={CHART_H} stroke="#383835" strokeWidth={1} />
          {rated.map((item, i) => {
            const x = i * SLOT + (SLOT - BAR_W) / 2;
            const h = Math.max(2, item.pct * (CHART_H - 24));
            const yTop = CHART_H - h;
            const r = Math.min(4, h / 2);
            const path = `M ${x},${CHART_H} L ${x},${yTop + r} Q ${x},${yTop} ${x + r},${yTop} L ${x + BAR_W - r},${yTop} Q ${x + BAR_W},${yTop} ${x + BAR_W},${yTop + r} L ${x + BAR_W},${CHART_H} Z`;
            return (
              <g key={item.key}>
                <title>
                  {item.label}: {formatPct(item.pct)} ({item.band})
                </title>
                <path d={path} fill={bandColor(item.band)} />
                <text x={x + BAR_W / 2} y={yTop - 6} textAnchor="middle" fontSize="11" fill="#c3c2b7">
                  {Math.round(item.pct * 100)}%
                </text>
                <text x={x + BAR_W / 2} y={CHART_H + 16} textAnchor="middle" fontSize="10" fill="#898781">
                  {truncateLabel(item.label, 9)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <BandLegend bands={bandsPresent} />
    </div>
  );
}

// Part-to-whole is a genuinely good fit for this specific breakdown — a
// handful of performance bands, short names, real counts — unlike the 10
// long-named scorecard categories, which stays a table rather than
// becoming a ten-slice pie. Slices are ordered and colored by the same
// fixed band scale as the bar chart above.
function BandPieChart({ bands, ariaLabel }) {
  const total = bands.length;
  if (total === 0) {
    return <div className="empty-state">Not enough rated scores yet to chart.</div>;
  }

  const tally = new Map();
  for (const band of bands) {
    tally.set(band, (tally.get(band) || 0) + 1);
  }
  const slices = BAND_ORDER.filter((b) => tally.has(b)).map((b) => ({ band: b, count: tally.get(b) }));

  const R = 78;
  const CX = 150;
  const CY = 116;
  const WIDTH = 300;
  const HEIGHT = 232;
  let angle = -Math.PI / 2;
  const drawn = slices.map((s) => {
    const frac = s.count / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    const endAngle = angle + sweep;
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const mid = angle + sweep / 2;
    const labelX = CX + (R + 24) * Math.cos(mid);
    const labelY = CY + (R + 24) * Math.sin(mid);
    const path = total === 1 ? null : `M ${CX},${CY} L ${x1},${y1} A ${R},${R} 0 ${largeArc} 1 ${x2},${y2} Z`;
    angle = endAngle;
    return { ...s, frac, path, labelX, labelY };
  });

  return (
    <div>
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        style={{ overflow: "visible", maxWidth: "100%" }}
      >
        {total === 1 ? (
          <circle cx={CX} cy={CY} r={R} fill={bandColor(drawn[0].band)} />
        ) : (
          drawn.map((s) => (
            <path key={s.band} d={s.path} fill={bandColor(s.band)} stroke="#19191b" strokeWidth={2} />
          ))
        )}
        {drawn
          .filter((s) => s.frac >= 0.06)
          .map((s) => (
            <text
              key={`label-${s.band}`}
              x={s.labelX}
              y={s.labelY}
              textAnchor={s.labelX > CX + 2 ? "start" : s.labelX < CX - 2 ? "end" : "middle"}
              fontSize="11"
              fill="#c3c2b7"
            >
              {s.band} ({s.count})
            </text>
          ))}
      </svg>
      <BandLegend bands={new Set(slices.map((s) => s.band))} />
    </div>
  );
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
function ByCoach({ coaches, entries, onDelete }) {
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
          <>
            <div className="card" style={{ marginBottom: "1.75rem" }}>
              <h3 className="section-title" style={{ marginBottom: "0.75rem", fontSize: "1.05rem" }}>
                Score over time
              </h3>
              <ScoreBarChart
                items={[...history]
                  .sort((a, b) => (a.periodKey < b.periodKey ? -1 : 1))
                  .map((h) => ({
                    key: h.id,
                    label: formatPeriodLabel(h.periodType, h.periodKey),
                    pct: h.categoriesRated > 0 ? h.pctRatedOnly : null,
                    band: h.band,
                  }))}
                ariaLabel={`${selected}'s % score by period`}
              />
            </div>
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
                  <th></th>
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
                    <td>
                      <button className="back-link" onClick={() => onDelete(h)} type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
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
function ResultsTable({ entries, periodType, periodKey, onDelete }) {
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

  const chartItems = rated
    .slice()
    .sort((a, b) => b.pctRatedOnly - a.pctRatedOnly)
    .map((r) => ({ key: r.coach, label: r.coach, pct: r.pctRatedOnly, band: r.band }));

  return (
    <div>
      <p className="section-subtitle">{formatPeriodLabel(periodType, periodKey)}</p>

      <div className="card-grid" style={{ marginBottom: "1.75rem" }}>
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: "0.75rem", fontSize: "1.05rem" }}>
            Every coach, this period
          </h3>
          <ScoreBarChart items={chartItems} ariaLabel="Every coach's % score this period" />
        </div>
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: "0.75rem", fontSize: "1.05rem" }}>
            Performance band mix
          </h3>
          <BandPieChart bands={rated.map((r) => r.band)} ariaLabel="Share of coaches in each performance band" />
        </div>
      </div>

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
              <th></th>
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
                <td>
                  <button className="back-link" onClick={() => onDelete(r)} type="button">
                    Delete
                  </button>
                </td>
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
function ImportReport({ periodType, periodKey, onChangeType, onChangeKey, onImported, onDeleteMany }) {
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

  async function handleDeleteImport() {
    const deleted = await onDeleteMany(result);
    if (deleted) {
      setResult(null);
      setStatus("idle");
      setFile(null);
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
          <button
            type="button"
            className="back-link"
            style={{ marginBottom: "0.75rem" }}
            onClick={handleDeleteImport}
          >
            Delete this import ({result.length})
          </button>
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

  // Shared by every delete button on this board — whether an entry was
  // typed in by hand or came from a report import, both are the same kind
  // of saved entry, deleted the same way. Returns whether it actually
  // happened, so a caller with its own local copy of the entry (the Import
  // report's result panel) knows whether to clear it too.
  async function deleteEntry(entry) {
    const res = await fetch("/api/scorecard", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach: entry.coach, periodType: entry.periodType, periodKey: entry.periodKey }),
    });
    const body = await res.json().catch(() => ({ ok: false }));
    if (!body.ok) throw new Error(body.error || "Delete failed");
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }

  async function handleDelete(entry) {
    if (
      !window.confirm(
        `Delete ${entry.coach}'s score for ${formatPeriodLabel(entry.periodType, entry.periodKey)}? This can't be undone.`
      )
    ) {
      return false;
    }
    try {
      await deleteEntry(entry);
      return true;
    } catch (err) {
      window.alert(err.message || "Delete failed");
      return false;
    }
  }

  async function handleDeleteMany(entriesToDelete) {
    if (!entriesToDelete || entriesToDelete.length === 0) return false;
    const n = entriesToDelete.length;
    if (!window.confirm(`Delete all ${n} score${n === 1 ? "" : "s"} from that import? This can't be undone.`)) {
      return false;
    }
    try {
      for (const entry of entriesToDelete) {
        await deleteEntry(entry);
      }
      return true;
    } catch (err) {
      window.alert(err.message || "Delete failed");
      return false;
    }
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
          <ResultsTable
            entries={entries}
            periodType={periodType}
            periodKey={periodKey}
            onDelete={handleDelete}
          />
        </div>
      ),
    },
    {
      key: "by-coach",
      label: "By coach",
      description: "One tile per coach — click through for their full score history",
      render: () => <ByCoach coaches={coaches} entries={entries} onDelete={handleDelete} />,
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
          onDeleteMany={handleDeleteMany}
        />
      ),
    },
  ];

  return <TopicBoard topics={topics} />;
}
