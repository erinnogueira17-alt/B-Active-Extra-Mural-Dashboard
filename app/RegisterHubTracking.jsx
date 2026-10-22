"use client";

import { useState } from "react";
import CoachPlayerCard from "./CoachPlayerCard.jsx";
import {
  ROTATION_ANCHOR,
  addDaysKey,
  dayKeyOf,
  dayLabel,
  isConcernOverdue,
  parseDateKey,
  rotationWeeksInMonth,
  strikeDueConcerns,
  todayDateKey,
  weekStartKey,
} from "../lib/registerHub.js";
import { canonicalizeCoachName, currentMonthKey, formatPeriodLabel } from "../lib/scorecard.js";
import {
  MIN_CHECKED_LESSONS,
  computeCoachScorecard,
  leadingCoach,
  sortByScore,
} from "../lib/registerHubScoring.js";
import {
  buildDailySnapshot,
  buildWeeklyReport,
  formatDateLong,
  formatWeekRange,
  snapshotAsText,
} from "../lib/registerHubReport.js";
import { renderSnapshotPng } from "../lib/registerHubImage.js";
import { downloadWeeklyReportPdf } from "../lib/registerHubPdf.js";
import { buildDayPoster, renderDayPosterPng } from "../lib/registerHubPoster.js";
import { photoFileToUrl, renderMarketingPhotoPng } from "../lib/registerHubMarketingPhoto.js";

const ZA_TIME = { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" };

function monthOffsetKey(monthKey, offset) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function priorOccurrence(concern, concerns) {
  const priorWeek = addDaysKey(weekStartKey(concern.date), -7);
  return concerns.find(
    (p) =>
      p.id !== concern.id &&
      p.school === concern.school &&
      p.type === concern.type &&
      weekStartKey(p.date) === priorWeek
  );
}

// Attaches an evidence file (image or PDF) to a concern or rotation week.
function EvidenceUpload({ targetType, targetId, evidenceFiles, onUploaded }) {
  const [status, setStatus] = useState("idle");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetType", targetType);
      formData.append("targetId", targetId);
      const res = await fetch("/api/register-hub/evidence", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Upload failed");
      onUploaded(body.target);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ marginTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
      {(evidenceFiles || []).map((f) => (
        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="kpi-sub">
          {f.filename}
        </a>
      ))}
      <label className="back-link" style={{ marginBottom: 0, cursor: "pointer" }}>
        {status === "uploading" ? "Uploading…" : "Attach evidence"}
        <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFile} />
      </label>
      {status === "error" && (
        <span className="kpi-sub" style={{ color: "var(--negative)" }}>
          Upload failed — retry
        </span>
      )}
    </div>
  );
}

function ConcernCard({ concern, now, strikeDue, showCoach, onSetResolved, onCommunicate, onEvidenceUploaded }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const resolved = concern.status === "resolved";
  const overdue = isConcernOverdue(concern, now);
  const history = concern.communications?.length
    ? concern.communications
    : concern.reply
    ? [{ id: "legacy", date: (concern.repliedAt || "").slice(0, 10), text: concern.reply }]
    : [];

  async function handleSend() {
    if (!message.trim()) return;
    setSaving(true);
    const ok = await onCommunicate(concern.id, message);
    setSaving(false);
    if (ok) setMessage("");
  }

  return (
    <div className="card" style={{ marginBottom: "0.75rem", opacity: resolved ? 0.65 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <span className={`concern-tag ${concern.urgency}`}>{concern.type}</span>
          {strikeDue && !concern.strike && <span className="compliance-badge non-compliant">Strike due</span>}
          {concern.strike && <span className="compliance-badge non-compliant">Strike issued</span>}
          {overdue && !resolved && (
            <span className="kpi-sub" style={{ color: "var(--negative)", marginLeft: "0.5rem" }}>
              Overdue
            </span>
          )}
        </div>
        <span className="kpi-sub">
          {showCoach ? `${concern.coach} · ` : ""}
          {concern.school} · logged {concern.date}
        </span>
      </div>
      <p className="kpi-sub" style={{ marginTop: "0.35rem" }}>
        Resolve by {new Date(concern.resolveBy).toLocaleString("en-ZA", ZA_TIME)}
        {concern.note ? ` · Note: ${concern.note}` : ""}
      </p>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem", color: "var(--text)" }}>
        <input
          type="checkbox"
          checked={resolved}
          onChange={(e) => onSetResolved(concern.id, e.target.checked)}
          style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--accent)", cursor: "pointer" }}
        />
        Resolved
      </label>

      {history.length > 0 && (
        <div style={{ marginTop: "0.6rem" }}>
          <p className="kpi-sub" style={{ marginBottom: "0.25rem" }}>
            Messages from the coach
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {history.map((m) => (
              <li key={m.id} className="kpi-sub" style={{ marginBottom: "0.2rem" }}>
                {m.date ? `${m.date} — ` : ""}
                {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!resolved && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.6rem", alignItems: "center" }}>
          <input
            className="name-search"
            style={{ marginBottom: 0, maxWidth: "360px", flex: "1 1 240px" }}
            type="text"
            placeholder="Add a message the coach sent"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="back-link" style={{ marginBottom: 0 }} type="button" onClick={handleSend} disabled={saving}>
            {saving ? "Saving…" : "Save message"}
          </button>
        </div>
      )}
      <EvidenceUpload
        targetType="concern"
        targetId={concern.id}
        evidenceFiles={concern.evidenceFiles}
        onUploaded={onEvidenceUploaded}
      />
    </div>
  );
}

// Every register concern, oldest first, with a one-click resolved tick so
// past concerns can be closed out after the fact.
export function ReviewQueue({ concerns, onSetResolved, onCommunicate, onEvidenceUploaded }) {
  const [filter, setFilter] = useState("open");
  const now = new Date();
  const dueIds = new Set(strikeDueConcerns(concerns));
  const shown = concerns
    .filter((c) => filter === "all" || (filter === "open" ? c.status !== "resolved" : c.status === "resolved"))
    .sort((a, b) => a.date.localeCompare(b.date));
  const openCount = concerns.filter((c) => c.status !== "resolved").length;

  return (
    <div>
      <p className="section-subtitle">
        Every register concern, oldest first. Tick a concern as resolved once it's fixed, and log any message the
        coach has sent about it.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          ["open", "Open"],
          ["resolved", "Resolved"],
          ["all", "All"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="back-link"
            type="button"
            style={{ marginBottom: 0, fontWeight: filter === key ? 700 : 400 }}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
        <span className="kpi-sub">{openCount} open in total</span>
      </div>
      {shown.length === 0 ? (
        <div className="empty-state">No concerns to show here.</div>
      ) : (
        shown.map((c) => (
          <ConcernCard
            key={c.id}
            concern={c}
            now={now}
            showCoach
            strikeDue={dueIds.has(c.id)}
            onSetResolved={onSetResolved}
            onCommunicate={onCommunicate}
            onEvidenceUploaded={onEvidenceUploaded}
          />
        ))
      )}
    </div>
  );
}

export function StrikeTracker({ concerns, onStrike }) {
  const dueIds = new Set(strikeDueConcerns(concerns));
  const due = concerns
    .filter((c) => dueIds.has(c.id) && !c.strike)
    .sort((a, b) => a.date.localeCompare(b.date));
  const issued = concerns
    .filter((c) => c.strike)
    .sort((a, b) => (b.strikeAt || "").localeCompare(a.strikeAt || ""));
  const coaches = [...new Set(concerns.map((c) => canonicalizeCoachName(c.coach || "")).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );

  return (
    <div>
      <p className="section-subtitle">
        A strike is due when the same register concern (same school and type) is logged again the following week
        while it's still unresolved. Issuing the strike is your confirmation.
      </p>

      <div className="card-grid" style={{ marginBottom: "1.5rem" }}>
        {coaches.length === 0 && <div className="empty-state">No register concerns logged yet.</div>}
        {coaches.map((coach) => {
          const dueCount = due.filter((c) => canonicalizeCoachName(c.coach) === coach).length;
          const issuedCount = issued.filter((c) => canonicalizeCoachName(c.coach) === coach).length;
          return (
            <div key={coach} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                <h4 className="section-title" style={{ fontSize: "1rem", marginBottom: 0 }}>
                  {coach}
                </h4>
                <span className={`compliance-badge ${dueCount > 0 ? "non-compliant" : "compliant"}`}>
                  {dueCount > 0 ? "Strike due" : "No strike due"}
                </span>
              </div>
              <p className="kpi-sub" style={{ marginTop: "0.5rem" }}>
                Strikes issued: {issuedCount}
              </p>
            </div>
          );
        })}
      </div>

      <h3 className="section-title">Strike due — needs a decision</h3>
      {due.length === 0 ? (
        <div className="empty-state">No strikes due right now.</div>
      ) : (
        due.map((c) => {
          const prior = priorOccurrence(c, concerns);
          return (
            <div key={c.id} className="card" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong style={{ color: "var(--text)" }}>{c.coach}</strong>
                  <span className="kpi-sub"> · {c.school}</span>
                  <div style={{ marginTop: "0.35rem" }}>
                    <span className={`concern-tag ${c.urgency}`}>{c.type}</span>
                  </div>
                </div>
                <button
                  className="back-link"
                  type="button"
                  style={{ marginBottom: 0, color: "var(--negative)" }}
                  onClick={() => onStrike(c.id)}
                >
                  Issue strike
                </button>
              </div>
              <p className="kpi-sub" style={{ marginTop: "0.4rem" }}>
                First logged {prior?.date || "the previous week"} · logged again {c.date}, still unresolved
              </p>
            </div>
          );
        })
      )}

      <h3 className="section-title" style={{ marginTop: "2rem" }}>
        Strikes issued
      </h3>
      {issued.length === 0 ? (
        <div className="empty-state">No strikes issued yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Coach</th>
                <th>School</th>
                <th>Concern</th>
                <th>Logged</th>
                <th>Strike issued</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((c) => (
                <tr key={c.id}>
                  <td>{c.coach}</td>
                  <td>{c.school}</td>
                  <td>{c.type}</td>
                  <td>{c.date}</td>
                  <td>{(c.strikeAt || "").slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SnapshotTopic({ schools, concerns }) {
  const [date, setDate] = useState(() => todayDateKey());
  const [status, setStatus] = useState("");
  const snapshot = buildDailySnapshot(date || todayDateKey(), { schools, concerns });

  async function handleDownload() {
    setStatus("Creating image…");
    try {
      const blob = await renderSnapshotPng(snapshot);
      downloadBlob(blob, `register-concerns-${snapshot.dateKey}.png`);
      setStatus("Image downloaded — send it to the group.");
    } catch {
      setStatus("Couldn't create the image — try again.");
    }
  }

  async function handlePoster() {
    const poster = buildDayPoster(date || todayDateKey(), schools);
    if (!poster.dayName) {
      setStatus("No lessons fall on a weekend — pick a weekday.");
      return;
    }
    setStatus("Creating day poster…");
    try {
      const blob = await renderDayPosterPng(poster);
      downloadBlob(blob, `b-active-schools-${poster.dateKey}.png`);
      setStatus("Day poster downloaded — send it to the group.");
    } catch {
      setStatus("Couldn't create the poster — try again.");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snapshotAsText(snapshot));
      setStatus("Copied as text — paste it into the group.");
    } catch {
      setStatus("Couldn't copy — try the image instead.");
    }
  }

  return (
    <div>
      <p className="section-subtitle">
        The register concerns for one day, grouped by coach. Download it as an image or copy it as text to send to
        the coach group.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBottom: "1rem" }}>
        <input className="date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleDownload}>
          Download image (PNG)
        </button>
        <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleCopy}>
          Copy as text
        </button>
        <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handlePoster}>
          Download day poster (PNG)
        </button>
        {status && <span className="kpi-sub">{status}</span>}
      </div>

      {snapshot.total === 0 ? (
        <div className="empty-state">No register concerns logged for {formatDateLong(snapshot.dateKey)}.</div>
      ) : (
        <div className="card-grid">
          {snapshot.sections.map((section) => (
            <div key={section.school} className="card">
              <h4 className="section-title" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
                {section.school}
              </h4>
              <p className="kpi-sub" style={{ marginBottom: "0.6rem" }}>
                Coach: {section.coach}
              </p>
              {section.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: "0.5rem" }}>
                  <span className={`concern-tag ${item.urgency}`}>
                    {idx + 1}. {item.type}
                  </span>
                  {item.note && <p className="kpi-sub">{item.note}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PhotoOfTheDay({ schools, photoOfDay = [], onPhotoSaved }) {
  const [date, setDate] = useState(() => todayDateKey());
  const [schoolId, setSchoolId] = useState("");
  const [file, setFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const day = dayKeyOf(parseDateKey(date || todayDateKey()));
  const options = schools
    .filter((s) => s.active !== false && s.lessonDay === day)
    .sort((a, b) => a.name.localeCompare(b.name));
  const chosen = options.find((s) => s.id === schoolId) || null;
  const savedForDay = photoOfDay.find((p) => p.date === date) || null;
  const savedList = [...photoOfDay].sort((a, b) => b.date.localeCompare(a.date));

  function clearResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl("");
    setResultBlob(null);
    setStatus("");
  }

  async function handleCreate() {
    if (!chosen || !file) {
      setStatus("Choose a school and upload a photo first.");
      return;
    }
    setStatus("Creating post…");
    const photoSrc = photoFileToUrl(file);
    try {
      const blob = await renderMarketingPhotoPng({ photoSrc, coach: chosen.coach, school: chosen.name });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setStatus("Post ready — save it for this day or download it.");
    } catch (err) {
      setStatus(err.message || "Couldn't create the post — try again.");
    } finally {
      URL.revokeObjectURL(photoSrc);
    }
  }

  async function handleSave() {
    if (!resultBlob || !chosen) return;
    setSaving(true);
    setStatus("Saving for this day…");
    try {
      const formData = new FormData();
      formData.append("file", resultBlob, "post.png");
      formData.append("date", date);
      formData.append("schoolId", chosen.id);
      formData.append("school", chosen.name);
      formData.append("coach", chosen.coach || "");
      const res = await fetch("/api/register-hub/photo-of-day", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Save failed");
      onPhotoSaved(body.record);
      setStatus(`Saved for ${formatDateLong(date)}.`);
    } catch (err) {
      setStatus(err.message || "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    if (!resultBlob || !chosen) return;
    const schoolSlug = chosen.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    downloadBlob(resultBlob, `marketing-photo-${date}-${schoolSlug}.png`);
  }

  return (
    <div>
      <p className="section-subtitle">
        Choose the day and the school, upload the coach&apos;s photo, create the post, then save it for the day so
        there&apos;s a record.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBottom: "0.75rem" }}>
        <input
          className="date-input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSchoolId("");
            clearResult();
          }}
        />
        <select
          className="date-input"
          value={schoolId}
          onChange={(e) => {
            setSchoolId(e.target.value);
            clearResult();
          }}
        >
          <option value="">{options.length ? "Choose school" : "No schools on this day"}</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.coach || "no coach"}
            </option>
          ))}
        </select>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            clearResult();
          }}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
        <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleCreate}>
          Create post
        </button>
        {resultBlob && (
          <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save for this day"}
          </button>
        )}
        {resultBlob && (
          <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleDownload}>
            Download PNG
          </button>
        )}
        {status && <span className="kpi-sub">{status}</span>}
      </div>
      {resultUrl && (
        <img
          src={resultUrl}
          alt="Photo of the day post"
          style={{ display: "block", width: "100%", maxWidth: "360px", marginTop: "1rem", borderRadius: "14px", border: "1px solid var(--border)" }}
        />
      )}

      <h3 className="section-title" style={{ marginTop: "2rem" }}>
        Saved for {formatDateLong(date)}
      </h3>
      {savedForDay ? (
        <div className="card" style={{ maxWidth: "360px" }}>
          <img
            src={savedForDay.imageUrl}
            alt={`Saved post for ${savedForDay.school}`}
            style={{ display: "block", width: "100%", borderRadius: "10px", marginBottom: "0.6rem" }}
          />
          <p className="kpi-sub" style={{ marginBottom: "0.3rem" }}>
            {savedForDay.school} · {savedForDay.coach || "no coach"}
          </p>
          <a href={savedForDay.imageUrl} target="_blank" rel="noreferrer">
            Open full image ↗
          </a>
        </div>
      ) : (
        <div className="empty-state">No photo saved for this day yet.</div>
      )}

      <h3 className="section-title" style={{ marginTop: "2rem" }}>
        All saved photos
      </h3>
      {savedList.length === 0 ? (
        <div className="empty-state">No photos saved yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>School</th>
                <th>Coach</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {savedList.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{p.school}</td>
                  <td>{p.coach || "—"}</td>
                  <td>
                    <a href={p.imageUrl} target="_blank" rel="noreferrer">
                      Open ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function WeeklyReport({ schools, dailyChecks, concerns }) {
  const [anyDate, setAnyDate] = useState(() => todayDateKey());
  const [status, setStatus] = useState("");
  const report = buildWeeklyReport(anyDate || todayDateKey(), { schools, dailyChecks, concerns });

  async function handleDownload() {
    setStatus("Creating PDF…");
    try {
      await downloadWeeklyReportPdf(report);
      setStatus("PDF downloaded.");
    } catch {
      setStatus("Couldn't create the PDF — try again.");
    }
  }

  return (
    <div>
      <p className="section-subtitle">
        Monday to Friday register compliance for each coach. A coach is non-compliant for as long as any of their
        register concerns is still open.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBottom: "1rem" }}>
        <input className="date-input" type="date" value={anyDate} onChange={(e) => setAnyDate(e.target.value)} />
        <strong>{formatWeekRange(report.weekStart)}</strong>
        <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleDownload}>
          Download PDF
        </button>
        {status && <span className="kpi-sub">{status}</span>}
      </div>

      {report.rows.length === 0 ? (
        <div className="empty-state">No coaches with schools set up in Setup yet.</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: "1rem", borderColor: report.needsSupport.length ? "var(--negative)" : "var(--positive)" }}>
            <h3 className="section-title" style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>
              {report.needsSupport.length ? "Coaches who need support" : "All coaches compliant this week"}
            </h3>
            {report.needsSupport.map((r) => (
              <p key={r.coach} className="kpi-sub" style={{ margin: "0.2rem 0" }}>
                <strong style={{ color: "var(--text)" }}>{r.coach}</strong> — {r.openConcerns} open register concern
                {r.openConcerns === 1 ? "" : "s"}
                {r.strikes > 0 ? `, ${r.strikes} strike${r.strikes === 1 ? "" : "s"} issued` : ""}
              </p>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Lessons</th>
                  <th>Checked</th>
                  <th>Not checked</th>
                  <th>Evening admin</th>
                  <th>Concerns</th>
                  <th>Open</th>
                  <th>Strikes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const ok = r.registerCompliant && r.strikes === 0;
                  return (
                    <tr key={r.coach}>
                      <td>{r.coach}</td>
                      <td>{r.lessons}</td>
                      <td>{r.checked}</td>
                      <td>{r.unchecked}</td>
                      <td>{r.eveningPct == null ? "–" : `${r.eveningPct}%`}</td>
                      <td>{r.loggedThisWeek}</td>
                      <td>{r.openConcerns}</td>
                      <td>{r.strikes}</td>
                      <td>
                        <span className={`compliance-badge ${ok ? "compliant" : "non-compliant"}`}>
                          {ok ? "Compliant" : "Needs support"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const ROTATION_DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// "5 Oct", read as a date-only key so the day never shifts with the viewer's timezone.
const shortDay = (dateKey) =>
  parseDateKey(dateKey).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" });

// Coach of the Month banner, gold, showing the coach leading this month. It
// updates as scores change; a coach only leads once eligible.
function CoachOfMonthBanner({ scorecards }) {
  if (scorecards.length === 0) return null;
  const leader = leadingCoach(scorecards);
  const shown = leader || sortByScore(scorecards)[0];
  const registerPct = Math.round((shown.registerScore / 60) * 100);
  const rotationPct = Math.round((shown.rotationScore / 20) * 100);
  const photoPct = Math.round((shown.photoScore / 20) * 100);
  const points = Math.round(shown.total);
  return (
    <section className="rh-cotm">
      <div className="rh-cotm-badge" aria-hidden="true">
        #1
      </div>
      <div className="rh-cotm-body">
        <small>{leader ? "LEADING FOR COACH OF THE MONTH" : "TOP SCORE SO FAR · NOT YET ELIGIBLE"}</small>
        <div className="rh-cotm-name">{shown.coach}</div>
        <div className="rh-cotm-meta">
          {leader
            ? `${points} points · register ${registerPct}% · rotation ${rotationPct}% · photo of the day ${photoPct}%`
            : `Needs ${MIN_CHECKED_LESSONS} checked lessons and no strikes to qualify · ${points} points`}
        </div>
      </div>
    </section>
  );
}

// One rotation week: every huddle on the schedule with each coach's three
// ticks, a Tick all button per huddle, and any coach not on a huddle below.
function RotationWeek({ weekKey, huddles, coaches, rows, onTick, onTickAll, onEvidenceUploaded }) {
  const rowFor = (coach) =>
    rows.find((r) => canonicalizeCoachName(r.coach) === coach) || {
      coach,
      completed: false,
      onTime: false,
      attendedHuddle: false,
      evidenceFiles: [],
    };

  const slots = huddles
    .filter((h) => ROTATION_DAY_ORDER.includes(h.day))
    .map((h) => ({ ...h, date: addDaysKey(weekKey, ROTATION_DAY_ORDER.indexOf(h.day)) }))
    .sort(
      (a, b) =>
        ROTATION_DAY_ORDER.indexOf(a.day) - ROTATION_DAY_ORDER.indexOf(b.day) || a.time.localeCompare(b.time)
    );
  const huddleCoaches = [...new Set(slots.flatMap((s) => s.coaches))];
  const others = coaches.filter((c) => !huddleCoaches.includes(c));
  const fullyComplete = huddleCoaches.filter((c) => {
    const row = rowFor(c);
    return row.completed && row.onTime && row.attendedHuddle;
  }).length;

  const today = todayDateKey();
  const weekEnd = addDaysKey(weekKey, 4);
  const status = weekKey > today ? "upcoming" : weekEnd < today ? "week over" : "this week";

  const coachRow = (coach) => {
    const row = rowFor(coach);
    const tick = (field, label) => (
      <button
        type="button"
        className="rh-rtick"
        aria-pressed={!!row[field]}
        onClick={() => onTick(weekKey, coach, field, !row[field], row)}
      >
        <span className="rh-box">{row[field] ? "✓" : ""}</span>
        {label}
      </button>
    );
    return (
      <div key={coach} className="rh-rrow">
        <span>{coach}</span>
        <span className="rh-rticks">
          {tick("completed", "Completed")}
          {tick("onTime", "On time")}
          {tick("attendedHuddle", "Huddle")}
        </span>
      </div>
    );
  };

  const evidenceCoaches = [...huddleCoaches, ...others].filter((c) => rowFor(c).id);

  return (
    <section className="rh-rot">
      <div className="rh-rot-h">
        <h4>
          Rotation week · {shortDay(weekKey)} – {shortDay(weekEnd)}
        </h4>
        <span className="kpi-sub">
          {fullyComplete} of {huddleCoaches.length} fully complete · {status}
        </span>
      </div>
      {slots.length === 0 ? (
        <p className="kpi-sub">Add the huddles in Setup to see the rotation slots.</p>
      ) : (
        <div className="rh-slots">
          {slots.map((slot) => (
            <div key={`${slot.day}-${slot.time}-${slot.coaches.join("|")}`} className="rh-slot">
              <div className="rh-slot-h">
                <span>
                  <b>
                    {dayLabel(slot.day)} {shortDay(slot.date)}
                  </b>{" "}
                  · {slot.time} huddle
                </span>
                <button className="back-link" type="button" onClick={() => onTickAll(weekKey, slot.coaches)}>
                  Tick all
                </button>
              </div>
              {slot.coaches.map(coachRow)}
            </div>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <details className="rh-others">
          <summary>Other coaches ({others.length})</summary>
          {others.map(coachRow)}
        </details>
      )}
      {evidenceCoaches.length > 0 && (
        <details className="rh-others">
          <summary>Evidence for this week</summary>
          {evidenceCoaches.map((coach) => {
            const row = rowFor(coach);
            return (
              <div key={coach} className="rh-rrow">
                <span>{coach}</span>
                <EvidenceUpload
                  targetType="rotation"
                  targetId={row.id}
                  evidenceFiles={row.evidenceFiles}
                  onUploaded={onEvidenceUploaded}
                />
              </div>
            );
          })}
        </details>
      )}
    </section>
  );
}

export function ScoreSnapshot({
  coaches,
  huddles = [],
  concerns,
  dailyChecks,
  rotationChecks,
  onRotationUpserted,
  coachPhotos = {},
  onCoachPhotoSaved,
}) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [newWeek, setNewWeek] = useState("");

  const monthConcernCount = (coach) =>
    concerns.filter((c) => canonicalizeCoachName(c.coach || "") === coach && c.date.startsWith(monthKey)).length;

  // Scheduled rotation weeks plus any week already ticked, so nothing is hidden.
  const trackedWeekKeys = [
    ...new Set(rotationChecks.filter((r) => r.weekKey.startsWith(monthKey)).map((r) => r.weekKey)),
  ];
  const weekKeys = [...new Set([...rotationWeeksInMonth(monthKey), ...trackedWeekKeys])].sort();

  // Highest score first, so the card rank and the leader banner agree.
  const scorecards = sortByScore(
    coaches.map((coach) => ({
      coach,
      ...computeCoachScorecard(coach, { dailyChecks, concerns, rotationChecks, monthKey }),
    }))
  );
  const leader = leadingCoach(scorecards);

  // Saves one coach's three ticks for a rotation week.
  async function saveRotation(weekKey, coach, values, row) {
    const res = await fetch("/api/register-hub/rotation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id || undefined,
        weekKey,
        coach,
        completed: !!values.completed,
        onTime: !!values.onTime,
        attendedHuddle: !!values.attendedHuddle,
      }),
    });
    const body = await res.json().catch(() => ({ ok: false }));
    if (body.ok) onRotationUpserted(body.rotationCheck);
  }

  function handleRotationToggle(weekKey, coach, field, checked, row) {
    return saveRotation(weekKey, coach, { ...row, [field]: checked }, row);
  }

  // Ticks every coach on a huddle as completed, on time and at the huddle. The
  // saves run one after another, because each one rewrites the shared document.
  async function handleTickAll(weekKey, huddleCoaches) {
    for (const coach of huddleCoaches) {
      const row = rotationChecks.find((r) => r.weekKey === weekKey && canonicalizeCoachName(r.coach) === coach) || {};
      await saveRotation(weekKey, coach, { completed: true, onTime: true, attendedHuddle: true }, row);
    }
  }

  function handleAddWeek() {
    if (!newWeek || coaches.length === 0) return;
    handleRotationToggle(newWeek, coaches[0], "completed", false, {
      completed: false,
      onTime: false,
      attendedHuddle: false,
    });
    setNewWeek("");
  }

  function copySnapshot() {
    const lines = scorecards.map((s) => {
      const reasons = [];
      if (!s.compliant.concerns) reasons.push("open concerns");
      if (!s.compliant.rotations) reasons.push("rotation incomplete");
      if (!s.compliant.photo) reasons.push("missing photo");
      const label = s.compliant.overall ? "Compliant" : `Not compliant (${reasons.join(", ")})`;
      return `${s.coach}: ${label} — ${Math.round(s.total)}/100`;
    });
    const text = `Register Hub compliance — ${formatPeriodLabel("monthly", monthKey)}\n${lines.join("\n")}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button className="back-link" type="button" onClick={() => setMonthKey((k) => monthOffsetKey(k, -1))}>
          ← Prev
        </button>
        <strong>{formatPeriodLabel("monthly", monthKey)}</strong>
        <button className="back-link" type="button" onClick={() => setMonthKey((k) => monthOffsetKey(k, 1))}>
          Next →
        </button>
        <button className="back-link" type="button" onClick={() => setMonthKey(currentMonthKey())}>
          This month
        </button>
      </div>

      <h3 className="section-title">Compliance scorecard</h3>
      <p className="section-subtitle">
        Compliant = no register concerns logged, every tracked rotation week fully ticked, and a marketing photo
        submitted on every checked lesson. The photo score is a provisional proxy until the photo-of-the-day winner
        picker is built.
      </p>
      <CoachOfMonthBanner scorecards={scorecards} />
      <button className="back-link" type="button" onClick={copySnapshot} style={{ marginBottom: "1rem" }}>
        Copy scorecard as text
      </button>
      {scorecards.length === 0 ? (
        <div className="empty-state">No coaches yet — add schools with a coach in Setup first.</div>
      ) : (
        <>
          <div className="pcgrid">
            {scorecards.map((s, i) => (
              <div key={s.coach} className="pcwrap">
                <CoachPlayerCard
                  coach={s.coach}
                  rank={i + 1}
                  total={s.total}
                  stats={{
                    pas: Math.round((s.registerScore / 60) * 100),
                    dri: Math.round((s.rotationScore / 20) * 100),
                    def: Math.max(0, 100 - 20 * monthConcernCount(s.coach)),
                    sho: Math.round((s.photoScore / 20) * 100),
                  }}
                  photoUrl={coachPhotos[s.coach] || ""}
                  compliant={s.compliant.overall}
                  strikeCount={s.strikeCount}
                  isTop={leader?.coach === s.coach}
                  spinDelay={-Math.round((((i + 1) * 2.7) % 12) * 10) / 10}
                  onPhotoSaved={onCoachPhotoSaved}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: "13px", color: "var(--muted, #76665f)", margin: "0 0 1.5rem" }}>
            OVR = total score out of 100. REG = register compliance %, ROT = rotation %, CON = concerns score, PHO = marketing
            photo of the day %. Tap the camera on a card to add the coach&apos;s photo.
          </p>
        </>
      )}

      <h3 className="section-title" style={{ marginTop: "2rem" }}>
        Rotation &amp; huddles
      </h3>
      <p className="section-subtitle">
        Rotation is every second week, with huddles on Thursday and Friday. Tick each coach as the week goes. Once you
        start ticking a week, any box left unticked counts as not done.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input className="date-input" type="date" value={newWeek} onChange={(e) => setNewWeek(e.target.value)} />
        <button className="back-link" type="button" onClick={handleAddWeek}>
          + Track an extra week
        </button>
      </div>
      {weekKeys.length === 0 ? (
        <div className="empty-state">No rotation week falls in this month.</div>
      ) : (
        weekKeys.map((weekKey) => (
          <RotationWeek
            key={weekKey}
            weekKey={weekKey}
            huddles={huddles}
            coaches={coaches}
            rows={rotationChecks.filter((r) => r.weekKey === weekKey)}
            onTick={handleRotationToggle}
            onTickAll={handleTickAll}
            onEvidenceUploaded={onRotationUpserted}
          />
        ))
      )}
    </div>
  );
}
