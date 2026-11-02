"use client";

import { useState } from "react";
import { AGES, BLOCKS, EQUIP, LESSONS, PICTO, TERM, WAIT } from "../../lib/curriculumData.js";
import { readSaved, writeSaved, saveText } from "./shared.js";

const INK = "#1d1a17";
const CONE = { green: "#3fbf4a", blue: "#2b9bf0", red: "#e8302f", yellow: "#f5c400" };

function lessonText(L) {
  const lines = [L.title + (L.draft ? " (DRAFT, not yet checked)" : ""), L.sport + " · " + L.phase, "Formation: " + L.formText, ""];
  for (const a of AGES) {
    lines.push("== " + a + " years ==");
    if (!L.ages[a]) {
      lines.push(WAIT, "");
      continue;
    }
    for (const s of L.ages[a]) {
      lines.push(s.t);
      if (s.b) lines.push(s.b);
      for (const x of s.l) lines.push("  - " + x);
      lines.push("");
    }
    lines.push(L.finish, "");
  }
  lines.push("Equipment: " + EQUIP[L.sport].join(", "));
  return lines.join("\n");
}

function termText() {
  const out = ["Term 1 curriculum", ""];
  TERM.forEach((w) => {
    out.push(BLOCKS[w.b].name + (w.phase ? " · " + w.phase : ""));
    if (!w.lesson) {
      out.push(w.note || "", "");
      return;
    }
    out.push(lessonText(LESSONS[w.lesson]), "");
  });
  return out.join("\n");
}

function Cone({ x, y, c }) {
  return <ellipse cx={x} cy={y} rx="7" ry="3.5" fill={c} stroke={INK} strokeWidth="0.5" />;
}

function Player({ x, y }) {
  return (
    <g stroke={INK} fill={INK}>
      <circle cx={x} cy={y - 10} r="3.5" stroke="none" />
      <line x1={x} y1={y - 6} x2={x} y2={y + 4} strokeWidth="2" />
      <line x1={x - 5} y1={y - 2} x2={x + 5} y2={y - 2} strokeWidth="1.8" />
      <line x1={x} y1={y + 4} x2={x - 4} y2={y + 11} strokeWidth="1.8" />
      <line x1={x} y1={y + 4} x2={x + 4} y2={y + 11} strokeWidth="1.8" />
    </g>
  );
}

// Formation drawn to a common grid: cones, then players.
function Formation({ form, label }) {
  const items = [];
  if (form === "circle") {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      items.push(<Cone key={"c" + i} x={160 + 95 * Math.cos(a)} y={115 + 80 * Math.sin(a)} c={CONE.green} />);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.3;
      items.push(<Player key={"p" + i} x={160 + 45 * Math.cos(a)} y={115 + 32 * Math.sin(a)} />);
    }
  } else if (form === "lines2") {
    for (let i = 0; i < 6; i++) {
      items.push(<Cone key={"a" + i} x={40 + i * 48} y={50} c={CONE.green} />, <Cone key={"b" + i} x={40 + i * 48} y={180} c={CONE.blue} />);
    }
    for (let i = 0; i < 4; i++) items.push(<Player key={"p" + i} x={70 + i * 60} y={115} />);
  } else if (form === "lines3") {
    for (let i = 0; i < 6; i++) {
      items.push(
        <Cone key={"a" + i} x={40 + i * 48} y={40} c={CONE.green} />,
        <Cone key={"b" + i} x={40 + i * 48} y={115} c={CONE.red} />,
        <Cone key={"c" + i} x={40 + i * 48} y={190} c={CONE.blue} />
      );
    }
    for (let i = 0; i < 4; i++) items.push(<Player key={"p" + i} x={60 + i * 65} y={150} />);
  } else {
    items.push(
      <Cone key="q1" x={50} y={35} c={CONE.green} />,
      <Cone key="q2" x={270} y={35} c={CONE.red} />,
      <Cone key="q3" x={50} y={195} c={CONE.yellow} />,
      <Cone key="q4" x={270} y={195} c={CONE.blue} />
    );
    for (let i = 0; i < 4; i++) items.push(<Player key={"p" + i} x={110 + i * 35} y={115} />);
  }
  return (
    <svg viewBox="0 0 320 230" role="img" aria-label={"Formation diagram: " + label} style={{ width: "100%", height: "auto", display: "block" }}>
      {items}
    </svg>
  );
}

export default function TermPlanTab() {
  const [selected, setSelected] = useState(null);
  const [age, setAge] = useState("4–6");
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState("");

  const lesson = selected ? LESSONS[selected] : null;
  const storageKey = selected ? "curriculum-" + selected : null;
  const current = saved && saved.key === storageKey ? saved.value : storageKey ? readSaved(storageKey) : {};

  function openLesson(id) {
    setSelected(id);
    setAge("4–6");
    setStatus("");
    setSaved({ key: "curriculum-" + id, value: readSaved("curriculum-" + id) });
  }

  function updateSaved(patch) {
    const next = { ...current, ...patch };
    writeSaved(storageKey, next);
    setSaved({ key: storageKey, value: next });
  }

  let rows = [];
  let lastBlock = null;
  let sessionNo = 0;
  TERM.forEach((w, i) => {
    if (w.b !== lastBlock) {
      lastBlock = w.b;
      sessionNo = 0;
      rows.push(
        <h4 key={"b" + i} className="cur-block">
          {BLOCKS[w.b].name}
        </h4>
      );
    }
    sessionNo += 1;
    const L = w.lesson ? LESSONS[w.lesson] : null;
    const isSelected = !!L && selected === w.lesson;
    rows.push(
      <button
        key={"w" + i}
        type="button"
        disabled={!L}
        aria-current={isSelected ? "true" : undefined}
        className={`cur-session${isSelected ? " is-selected" : ""}`}
        onClick={() => L && openLesson(w.lesson)}
      >
        <strong>{L ? L.title : "Session " + sessionNo}</strong>
        {L && L.draft ? <span className="cur-badge">Draft</span> : null}
        <small>{L ? (w.phase || L.phase) + " · " + L.sport : w.note}</small>
      </button>
    );
  });

  return (
    <div>
      <p className="section-subtitle">Draft lessons have not yet been checked by the coach lead.</p>
      <div className="cur-layout">
        <div>
          {rows}
          <button
            type="button"
            className="back-link"
            onClick={() => {
              saveText("Term-1-curriculum.txt", termText());
              setStatus("Term plan downloaded.");
            }}
          >
            Download the whole term
          </button>
          {status && !selected ? <p className="cur-muted">{status}</p> : null}
        </div>

        <article className="card">
          {!lesson ? (
            <p className="cur-muted">Choose a session to see its plan.</p>
          ) : (
            <>
              <div className="cur-header">
                <img src={PICTO[lesson.sport].src} alt={PICTO[lesson.sport].alt} className="cur-picto" />
                <div>
                  <h3 className="section-title" style={{ marginBottom: "0.3rem" }}>
                    {lesson.title}
                  </h3>
                  <p className="cur-muted" style={{ margin: 0 }}>
                    {lesson.sport} · {lesson.phase}
                    {lesson.draft ? " · Draft, not yet checked" : " · Coaches' sheet"}
                  </p>
                </div>
              </div>

              <div className="tab-strip" role="tablist" aria-label="Age group" style={{ marginTop: "1rem" }}>
                {AGES.map((a) => (
                  <button key={a} type="button" role="tab" aria-selected={age === a} className={`tab-pill${age === a ? " active" : ""}`} onClick={() => setAge(a)}>
                    {a} years
                  </button>
                ))}
              </div>

              <div className="cur-formation">
                <div className="cur-plot">
                  <Formation form={lesson.form} label={lesson.formText} />
                </div>
                <p className="cur-muted" style={{ margin: 0 }}>
                  <strong>Formation:</strong> {lesson.formText}. The diagram is a guide. Adjust the space to your training area.
                </p>
              </div>

              {!lesson.ages[age] ? (
                <p className="cur-muted">{WAIT}</p>
              ) : (
                <>
                  {lesson.ages[age].map((s, i) => (
                    <div key={i} className="cur-section">
                      <h4 className="cur-heading">{s.t}</h4>
                      {s.b ? <p style={{ margin: "0 0 0.4rem" }}>{s.b}</p> : null}
                      {s.l.length ? (
                        <ul className="cur-activities">
                          {s.l.map((x, j) => (
                            <li key={j}>{x}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                  <div className="cur-section">
                    <p style={{ margin: 0 }}>{lesson.finish}</p>
                  </div>
                </>
              )}

              <div className="cur-section">
                <h4 className="cur-heading">Equipment</h4>
                <div className="cur-equipment">
                  {EQUIP[lesson.sport].map((e, i) => (
                    <label key={e}>
                      <input
                        type="checkbox"
                        checked={!!(current.checks && current.checks[i])}
                        onChange={(ev) => updateSaved({ checks: { ...(current.checks || {}), [i]: ev.target.checked } })}
                      />
                      {e}
                    </label>
                  ))}
                </div>
              </div>

              <div className="cur-section">
                <h4 className="cur-heading">Notes</h4>
                <textarea
                  aria-label="Notes for this lesson"
                  className="date-input cur-notes"
                  value={current.notes || ""}
                  onChange={(ev) => updateSaved({ notes: ev.target.value })}
                  placeholder="What worked, what to change next time"
                />
              </div>

              <div className="cur-actions">
                <button
                  type="button"
                  className="tab-pill active"
                  onClick={() => {
                    saveText("Curriculum-" + lesson.title.replace(/\s+/g, "-") + ".txt", lessonText(lesson));
                    setStatus("Lesson downloaded.");
                  }}
                >
                  Download this lesson
                </button>
                {status && selected ? <span className="cur-muted">{status}</span> : null}
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
