"use client";

import { useState } from "react";
import TopicBoard from "./TopicBoard.jsx";
import {
  CONCERN_TYPES,
  DAYS_OF_WEEK,
  dayLabel,
  dayKeyOf,
  parseDateKey,
  todayDateKey,
} from "../lib/registerHub.js";
import { listCoachNameAliases } from "../lib/scorecard.js";

function ComingSoon({ children }) {
  return <div className="empty-state">{children}</div>;
}

// ---------- Setup: schools ----------

const emptySchoolForm = {
  id: null,
  name: "",
  lessonDay: "monday",
  coach: "",
  registerLink: "",
  active: true,
};

// Add/edit one school. Keyed by the parent on editing?.id so switching
// which school is being edited (or back to "add new") remounts this with
// fresh state, same key-remount pattern EntryForm uses in
// CoachScorecardBoard.jsx — simpler and safer than trying to resync local
// state from a changing `editing` prop.
function SchoolForm({ editing, coaches, onSaved, onCancel }) {
  const [form, setForm] = useState(editing || emptySchoolForm);
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/register-hub/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Save failed");
      onSaved(body.school);
      if (!editing) setForm(emptySchoolForm);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: "1.25rem" }}>
      <h3 className="section-title" style={{ marginBottom: "0.75rem", fontSize: "1.05rem" }}>
        {editing ? `Edit ${editing.name}` : "Add a school"}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <input
          className="name-search"
          style={{ marginBottom: 0, maxWidth: "240px" }}
          type="text"
          placeholder="School name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <select
          className="date-input"
          value={form.lessonDay}
          onChange={(e) => setForm((f) => ({ ...f, lessonDay: e.target.value }))}
        >
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </select>
        <input
          className="name-search"
          style={{ marginBottom: 0, maxWidth: "200px" }}
          type="text"
          placeholder="Coach"
          list="register-hub-coach-options"
          value={form.coach}
          onChange={(e) => setForm((f) => ({ ...f, coach: e.target.value }))}
        />
        <datalist id="register-hub-coach-options">
          {(coaches || []).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          className="name-search"
          style={{ marginBottom: 0, maxWidth: "260px" }}
          type="url"
          placeholder="Register link (optional)"
          value={form.registerLink}
          onChange={(e) => setForm((f) => ({ ...f, registerLink: e.target.value }))}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Active
        </label>
      </div>
      <button
        className="back-link"
        type="submit"
        style={{ marginRight: "1rem", marginBottom: 0 }}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Saving…" : editing ? "Save changes" : "Add school"}
      </button>
      {editing && (
        <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={onCancel}>
          Cancel
        </button>
      )}
      {status === "error" && (
        <p className="kpi-sub" style={{ color: "var(--negative)", marginTop: "0.5rem" }}>
          Couldn&apos;t save — check the school name and try again.
        </p>
      )}
    </form>
  );
}

function SchoolList({ schools, onEdit, onDelete }) {
  if (schools.length === 0) {
    return <div className="empty-state">No schools yet — add one above.</div>;
  }
  const byDay = DAYS_OF_WEEK.map((day) => ({
    day,
    items: schools.filter((s) => s.lessonDay === day),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {byDay.map(({ day, items }) => (
        <div key={day} style={{ marginBottom: "1.5rem" }}>
          <h3 className="section-title" style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            {dayLabel(day)}
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Coach</th>
                  <th>Register</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.coach || "—"}</td>
                    <td>
                      {s.registerLink ? (
                        <a href={s.registerLink} target="_blank" rel="noreferrer">
                          Open ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{s.active ? "Active" : "Inactive"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="back-link"
                        style={{ marginRight: "1rem", marginBottom: 0 }}
                        onClick={() => onEdit(s)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="back-link"
                        style={{ marginBottom: 0 }}
                        onClick={() => onDelete(s)}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Setup: huddles ----------

function toDraftHuddles(huddles) {
  return (huddles || []).map((h) => ({ ...h, coachesText: (h.coaches || []).join(", ") }));
}

// Coaches are edited as a single comma-separated text field, kept as its
// own local string (coachesText) rather than re-splitting into an array on
// every keystroke — splitting live and feeding the rejoined array back
// into the input's value would eat the comma/space the user just typed
// (e.g. "Samu, " -> split -> filter(Boolean) drops the trailing empty
// piece -> displayed value collapses back to "Samu", so you can never
// actually type the separator). Only parsed into an array at save time.
function HuddleEditor({ huddles, onHuddlesChange }) {
  const [draft, setDraft] = useState(() => toDraftHuddles(huddles));
  const [status, setStatus] = useState("idle");

  function updateRow(idx, patch) {
    setDraft((d) => d.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
    setStatus("idle");
  }
  function addRow() {
    setDraft((d) => [...d, { id: null, day: "thursday", time: "", coachesText: "" }]);
  }
  function removeRow(idx) {
    setDraft((d) => d.filter((_, i) => i !== idx));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const payload = draft.map((h) => ({
      id: h.id,
      day: h.day,
      time: h.time,
      coaches: h.coachesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    try {
      const res = await fetch("/api/register-hub/huddles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huddles: payload }),
      });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Save failed");
      setDraft(toDraftHuddles(body.huddles));
      onHuddlesChange(body.huddles);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <h3 className="section-title" style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
        Huddle schedule
      </h3>
      <p className="section-subtitle">
        Every second week, Thursday and Friday — who&apos;s in each huddle group.
      </p>
      {draft.map((h, idx) => (
        <div
          key={idx}
          style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.6rem", alignItems: "center" }}
        >
          <select className="date-input" value={h.day} onChange={(e) => updateRow(idx, { day: e.target.value })}>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
          </select>
          <input
            className="date-input"
            type="time"
            value={h.time}
            onChange={(e) => updateRow(idx, { time: e.target.value })}
          />
          <input
            className="name-search"
            style={{ marginBottom: 0, maxWidth: "320px" }}
            type="text"
            placeholder="Coaches, comma-separated"
            value={h.coachesText}
            onChange={(e) => updateRow(idx, { coachesText: e.target.value })}
          />
          <button className="back-link" style={{ marginBottom: 0 }} type="button" onClick={() => removeRow(idx)}>
            Remove
          </button>
        </div>
      ))}
      <button className="back-link" type="button" style={{ marginRight: "1rem" }} onClick={addRow}>
        + Add huddle
      </button>
      <button className="back-link" type="button" onClick={handleSave} disabled={status === "saving"}>
        {status === "saving"
          ? "Saving…"
          : status === "saved"
          ? "Saved"
          : status === "error"
          ? "Save failed — retry"
          : "Save huddle schedule"}
      </button>
    </div>
  );
}

function NameAliases() {
  const aliases = listCoachNameAliases();
  if (aliases.length === 0) return null;
  return (
    <div className="card">
      <h3 className="section-title" style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
        Known name aliases
      </h3>
      <p className="section-subtitle">
        Different spellings already known to be the same coach — they merge into one identity
        everywhere on the dashboard. Not yet editable here; ask for a new one to be added.
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {aliases.map((a) => (
          <li key={a.alias} className="kpi-sub">
            {a.alias} → {a.canonical}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Setup({ schools, huddles, coaches, onSchoolsChange, onHuddlesChange }) {
  const [editingSchool, setEditingSchool] = useState(null);

  function handleSchoolSaved(school) {
    onSchoolsChange((prev) =>
      [...prev.filter((s) => s.id !== school.id), school].sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingSchool(null);
  }

  async function handleDeleteSchool(school) {
    if (!confirm(`Delete ${school.name}? This can't be undone.`)) return;
    const res = await fetch("/api/register-hub/schools", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: school.id }),
    });
    const body = await res.json().catch(() => ({ ok: false }));
    if (body.ok) onSchoolsChange((prev) => prev.filter((s) => s.id !== school.id));
  }

  return (
    <div>
      <SchoolForm
        key={editingSchool?.id || "new"}
        editing={editingSchool}
        coaches={coaches}
        onSaved={handleSchoolSaved}
        onCancel={() => setEditingSchool(null)}
      />
      <SchoolList schools={schools} onEdit={setEditingSchool} onDelete={handleDeleteSchool} />
      <HuddleEditor huddles={huddles} onHuddlesChange={onHuddlesChange} />
      <NameAliases />
    </div>
  );
}

// ---------- Daily check ----------

function ConcernPicker({ onAdd }) {
  const [type, setType] = useState(CONCERN_TYPES[0]);
  const [urgency, setUrgency] = useState("medium");
  const [note, setNote] = useState("");

  function handleAdd() {
    onAdd({ type, urgency, note });
    setNote("");
  }

  return (
    <div className="concern-form">
      <select className="date-input" value={type} onChange={(e) => setType(e.target.value)}>
        {CONCERN_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select className="date-input" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
        <option value="urgent">Urgent — resolve in 24h</option>
        <option value="medium">Medium — resolve by next lesson</option>
      </select>
      <input
        className="name-search"
        style={{ marginBottom: 0, maxWidth: "200px" }}
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="back-link" type="button" style={{ marginBottom: 0 }} onClick={handleAdd}>
        + Add concern
      </button>
    </div>
  );
}

// One school's row for the selected day — ticks, concerns, mark checked.
// Keyed by the parent on `${date}:${school.id}` so switching the selected
// date (or the set of schools shown) always starts this from the real
// saved state for that exact day/school, never a stale carry-over.
function DailyCheckSchoolCard({ school, date, existingCheck, existingConcerns, onSaved }) {
  const [evening, setEvening] = useState(
    existingCheck?.evening || {
      parentMessage: false,
      marketingPhoto: false,
      sentOnTime: false,
      cleanRegister: false,
    }
  );
  const [concerns, setConcerns] = useState(
    existingConcerns.map((c) => ({ type: c.type, urgency: c.urgency, note: c.note }))
  );
  const [status, setStatus] = useState("idle");

  function toggle(field) {
    setEvening((e) => ({ ...e, [field]: !e[field] }));
    setStatus("idle");
  }
  function addConcern(c) {
    setConcerns((list) => [...list, c]);
    setStatus("idle");
  }
  function removeConcern(idx) {
    setConcerns((list) => list.filter((_, i) => i !== idx));
    setStatus("idle");
  }

  async function handleMarkChecked() {
    setStatus("saving");
    try {
      const res = await fetch("/api/register-hub/daily-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, schoolId: school.id, evening, concerns }),
      });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error(body.error || "Save failed");
      onSaved(body.dailyCheck, body.concerns);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 className="section-title" style={{ marginBottom: 0, fontSize: "1.05rem" }}>
          {school.name}
        </h3>
        <span className="kpi-sub">
          {school.coach || "No coach set"}
          {existingCheck ? " · Checked" : ""}
        </span>
      </div>
      {school.registerLink && (
        <p className="kpi-sub" style={{ marginTop: "0.4rem" }}>
          <a href={school.registerLink} target="_blank" rel="noreferrer">
            Open register ↗
          </a>
        </p>
      )}
      <div className="check-row">
        <label>
          <input type="checkbox" checked={evening.parentMessage} onChange={() => toggle("parentMessage")} />
          Message to parents
        </label>
        <label>
          <input type="checkbox" checked={evening.marketingPhoto} onChange={() => toggle("marketingPhoto")} />
          Marketing photo
        </label>
        <label>
          <input type="checkbox" checked={evening.sentOnTime} onChange={() => toggle("sentOnTime")} />
          Sent on time
        </label>
        <label>
          <input type="checkbox" checked={evening.cleanRegister} onChange={() => toggle("cleanRegister")} />
          Clean register
        </label>
      </div>
      {concerns.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          {concerns.map((c, idx) => (
            <span key={idx} className={`concern-tag ${c.urgency}`}>
              {c.type}
              {c.note ? ` — ${c.note}` : ""}
              <button
                type="button"
                onClick={() => removeConcern(idx)}
                aria-label={`Remove ${c.type}`}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <ConcernPicker onAdd={addConcern} />
      <button
        className="back-link"
        type="button"
        onClick={handleMarkChecked}
        disabled={status === "saving"}
        style={{ marginTop: "0.5rem" }}
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
          ? "Saved ✓"
          : status === "error"
          ? "Save failed — retry"
          : existingCheck
          ? "Update check"
          : "Mark checked"}
      </button>
    </div>
  );
}

function DailyCheck({ schools, dailyChecks, concerns, onDailyCheckSaved }) {
  const [date, setDate] = useState(() => todayDateKey());
  const dayKey = dayKeyOf(parseDateKey(date));
  const todaysSchools = schools
    .filter((s) => s.active !== false && s.lessonDay === dayKey)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (schools.length === 0) {
    return <div className="empty-state">No schools set up yet — add schools in the Setup tab first.</div>;
  }

  return (
    <div>
      <input className="date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <p className="section-subtitle" style={{ marginTop: "0.75rem" }}>
        {dayKey
          ? `${dayLabel(dayKey)} — ${todaysSchools.length} school${todaysSchools.length === 1 ? "" : "s"}`
          : "No lesson day falls on a weekend."}
      </p>
      {todaysSchools.length === 0 ? (
        <div className="empty-state">No schools scheduled for this day.</div>
      ) : (
        todaysSchools.map((school) => {
          const id = `${date}:${school.id}`;
          const existingCheck = dailyChecks.find((d) => d.id === id);
          const existingConcerns = concerns.filter((c) => c.dailyCheckId === id);
          return (
            <DailyCheckSchoolCard
              key={id}
              school={school}
              date={date}
              existingCheck={existingCheck}
              existingConcerns={existingConcerns}
              onSaved={(dailyCheck, newConcerns) => onDailyCheckSaved(dailyCheck, newConcerns, school.id, date)}
            />
          );
        })
      )}
    </div>
  );
}

export default function RegisterHubBoard({ data, coaches }) {
  const [schools, setSchools] = useState(data.schools || []);
  const [huddles, setHuddles] = useState(data.huddles || []);
  const [dailyChecks, setDailyChecks] = useState(data.dailyChecks || []);
  const [concerns, setConcerns] = useState(data.concerns || []);

  function handleDailyCheckSaved(dailyCheck, newConcerns, schoolId, date) {
    const id = `${date}:${schoolId}`;
    setDailyChecks((prev) => [...prev.filter((d) => d.id !== id), dailyCheck]);
    setConcerns((prev) => [...prev.filter((c) => c.dailyCheckId !== id), ...newConcerns]);
  }

  const topics = [
    {
      key: "daily-check",
      label: "Daily check",
      description: "Tick each school's evening admin and register, sorted by lesson day.",
      render: () => (
        <DailyCheck
          schools={schools}
          dailyChecks={dailyChecks}
          concerns={concerns}
          onDailyCheckSaved={handleDailyCheckSaved}
        />
      ),
    },
    {
      key: "snapshot",
      label: "Snapshot",
      description: "Morning lineup image and the day's register concerns for the coach group.",
      render: () => <ComingSoon>Snapshot is coming in a later phase of the Register Hub.</ComingSoon>,
    },
    {
      key: "tracker",
      label: "Tracker",
      description: "Every concern, coach replies, resolve-by dates and strikes.",
      render: () => <ComingSoon>Tracker is coming in a later phase of the Register Hub.</ComingSoon>,
    },
    {
      key: "scorecard",
      label: "Scorecard",
      description: "Monthly points, rotation ticks, photo of the day and Coach of the Month.",
      render: () => (
        <ComingSoon>
          The Register Hub scorecard is coming in a later phase — once built, it will appear as a
          new topic on the Coach Scorecard board, alongside the existing weekly/monthly ratings.
        </ComingSoon>
      ),
    },
    {
      key: "weekly-report",
      label: "Weekly report",
      description: "Weekly and cumulative compliance PDFs, saved on the hub.",
      render: () => <ComingSoon>Weekly report is coming in a later phase of the Register Hub.</ComingSoon>,
    },
    {
      key: "setup",
      label: "Setup",
      description: "Schools, coaches, huddle schedule, points and name checks.",
      render: () => (
        <Setup
          schools={schools}
          huddles={huddles}
          coaches={coaches}
          onSchoolsChange={setSchools}
          onHuddlesChange={setHuddles}
        />
      ),
    },
  ];

  return <TopicBoard topics={topics} />;
}
