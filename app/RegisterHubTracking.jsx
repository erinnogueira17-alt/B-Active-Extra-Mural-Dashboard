"use client";

import { useState } from "react";
import {
  addDaysKey,
  dayKeyOf,
  isConcernOverdue,
  parseDateKey,
  strikeDueConcerns,
  todayDateKey,
  weekStartKey,
} from "../lib/registerHub.js";
import { canonicalizeCoachName, currentMonthKey, formatPeriodLabel } from "../lib/scorecard.js";
import { computeCoachScorecard } from "../lib/registerHubScoring.js";
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

function RotationWeekRow({ weekKey, coaches, rows, onToggle, onEvidenceUploaded }) {
  return (
    <div className="card" style={{ marginBottom: "0.75rem" }}>
      <h4 className="section-title" style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
        Week of {weekKey}
      </h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Coach</th>
              <th>Completed (8)</th>
              <th>On time (6)</th>
              <th>Attended huddle (6)</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => {
              const row = rows.find((r) => r.coach === coach) || {
                coach,
                completed: false,
                onTime: false,
                attendedHuddle: false,
                evidenceFiles: [],
              };
              return (
                <tr key={coach}>
                  <td>{coach}</td>
                  {["completed", "onTime", "attendedHuddle"].map((field) => (
                    <td key={field}>
                      <input
                        type="checkbox"
                        checked={!!row[field]}
                        onChange={(e) => onToggle(weekKey, coach, field, e.target.checked, row)}
                      />
                    </td>
                  ))}
                  <td>
                    {row.id ? (
                      <EvidenceUpload
                        targetType="rotation"
                        targetId={row.id}
                        evidenceFiles={row.evidenceFiles}
                        onUploaded={onEvidenceUploaded}
                      />
                    ) : (
                      <span className="kpi-sub">Tick a box first</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// The upload control sits beneath the card, not on its face, so the card
// stays clean for screenshots.
function CoachPhotoButton({ coach, hasPhoto, onPhotoSaved }) {
  const [status, setStatus] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("Uploading…");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coach", coach);
    try {
      const res = await fetch("/api/register-hub/coach-photo", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Upload failed");
      onPhotoSaved(coach, body.imageUrl);
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Upload failed");
    }
  }

  return (
    <label style={{ fontSize: "12px", fontWeight: 700, cursor: "pointer", color: "#7a0d12", textDecoration: "underline" }}>
      {status || (hasPhoto ? "Change photo" : "Add photo")}
      <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </label>
  );
}

function CoachCard({ coach, ovr, stats, photoUrl, compliant, strikeCount }) {
  const statItems = [
    { value: stats.pas, label: "PAS" },
    { value: stats.dri, label: "DRI" },
    { value: stats.def, label: "DEF" },
    { value: stats.sho, label: "SHO" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "280px",
        aspectRatio: "5 / 7",
        borderRadius: "22px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        color: "#1a0c08",
        background: "linear-gradient(170deg, #ffd23f 0%, #ff8a1f 38%, #e8302f 72%, #9e1119 100%)",
        border: "3px solid #f7dfa0",
        boxShadow: "0 0 24px rgba(255, 190, 60, 0.45)",
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Barlow", system-ui, sans-serif',
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif', fontWeight: 800, fontSize: "54px", lineHeight: 1 }}>
            {ovr}
          </div>
          <div style={{ fontFamily: '"Barlow Condensed", Arial, sans-serif', fontWeight: 700, fontSize: "15px", letterSpacing: "0.12em" }}>
            OVR
          </div>
        </div>
        <img
          src="/bactive-logo.png"
          alt=""
          style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#fff", padding: "3px", boxShadow: "0 0 0 2px #d6b25a" }}
        />
      </div>

      <div
        style={{
          marginTop: "8px",
          height: "100px",
          flexShrink: 0,
          borderRadius: "14px",
          overflow: "hidden",
          background: "rgba(90, 10, 16, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.35)",
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={coach} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: '"Barlow Condensed", Arial, sans-serif', fontWeight: 800, fontSize: "96px", color: "#f7dfa0" }}>
            {coach.charAt(0)}
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: "10px",
          fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
          fontWeight: 800,
          fontSize: "28px",
          lineHeight: 1,
          flexShrink: 0,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {coach}
      </div>
      <div style={{ flexShrink: 0, fontSize: "12px", fontWeight: 600, letterSpacing: "0.12em", color: "#7a0d12", textTransform: "uppercase" }}>
        Coach · {compliant ? "Compliant" : "Needs support"}
        {strikeCount > 0 ? ` · ${strikeCount} strike${strikeCount === 1 ? "" : "s"}` : ""}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 14px",
          borderTop: "2px solid rgba(122, 13, 18, 0.45)",
          paddingTop: "8px",
        }}
      >
        {statItems.map((st) => (
          <div key={st.label} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontFamily: '"Barlow Condensed", Arial, sans-serif', fontWeight: 800, fontSize: "24px", lineHeight: 1 }}>
              {st.value}
            </span>
            <span style={{ fontFamily: '"Barlow Condensed", Arial, sans-serif', fontWeight: 700, fontSize: "16px", color: "#7a0d12" }}>
              {st.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoreSnapshot({ coaches, concerns, dailyChecks, rotationChecks, onRotationUpserted, coachPhotos = {}, onCoachPhotoSaved }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [newWeek, setNewWeek] = useState("");

  const monthConcernCount = (coach) =>
    concerns.filter((c) => canonicalizeCoachName(c.coach || "") === coach && c.date.startsWith(monthKey)).length;
  const trackedWeekKeys = [
    ...new Set(rotationChecks.filter((r) => r.weekKey.startsWith(monthKey)).map((r) => r.weekKey)),
  ].sort();

  const scorecards = coaches.map((coach) => ({
    coach,
    ...computeCoachScorecard(coach, { dailyChecks, concerns, rotationChecks, monthKey }),
  }));

  async function handleRotationToggle(weekKey, coach, field, checked, row) {
    const res = await fetch("/api/register-hub/rotation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id || undefined,
        weekKey,
        coach,
        completed: field === "completed" ? checked : !!row.completed,
        onTime: field === "onTime" ? checked : !!row.onTime,
        attendedHuddle: field === "attendedHuddle" ? checked : !!row.attendedHuddle,
      }),
    });
    const body = await res.json().catch(() => ({ ok: false }));
    if (body.ok) onRotationUpserted(body.rotationCheck);
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
      <button className="back-link" type="button" onClick={copySnapshot} style={{ marginBottom: "1rem" }}>
        Copy scorecard as text
      </button>
      {scorecards.length === 0 ? (
        <div className="empty-state">No coaches yet — add schools with a coach in Setup first.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: "1.25rem",
            justifyItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          {scorecards.map((s) => (
            <div key={s.coach} style={{ width: "100%", maxWidth: "280px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <CoachCard
                coach={s.coach}
                ovr={Math.round(s.total)}
                stats={{
                  pas: Math.round((s.registerScore / 60) * 100),
                  dri: Math.round((s.rotationScore / 20) * 100),
                  def: Math.max(0, 100 - 20 * monthConcernCount(s.coach)),
                  sho: Math.round((s.photoScore / 20) * 100),
                }}
                photoUrl={coachPhotos[s.coach] || ""}
                compliant={s.compliant.overall}
                strikeCount={s.strikeCount}
              />
              <CoachPhotoButton
                coach={s.coach}
                hasPhoto={Boolean(coachPhotos[s.coach])}
                onPhotoSaved={onCoachPhotoSaved}
              />
            </div>
          ))}
        </div>
      )}

      <h3 className="section-title" style={{ marginTop: "2rem" }}>
        Rotation tracking
      </h3>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input className="date-input" type="date" value={newWeek} onChange={(e) => setNewWeek(e.target.value)} />
        <button className="back-link" type="button" onClick={handleAddWeek}>
          + Track this week
        </button>
      </div>
      {trackedWeekKeys.length === 0 ? (
        <div className="empty-state">No rotation weeks tracked this month yet.</div>
      ) : (
        trackedWeekKeys.map((weekKey) => (
          <RotationWeekRow
            key={weekKey}
            weekKey={weekKey}
            coaches={coaches}
            rows={rotationChecks.filter((r) => r.weekKey === weekKey)}
            onToggle={handleRotationToggle}
            onEvidenceUploaded={onRotationUpserted}
          />
        ))
      )}
    </div>
  );
}
