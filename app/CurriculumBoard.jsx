"use client";

import { useState } from "react";
import { AGES, BLOCKS, EQUIP, LESSONS, PICTO, TERM, WAIT, WAIT_1_2 } from "../lib/curriculumData.js";
import { AGE_COLOUR, AGE_GROUPS, COACH_TIPS, SPORTS, lessonsFor } from "../lib/curriculumLibrary.js";

const INK = "#1d1a17";
const CONE = { green: "#3fbf4a", blue: "#2b9bf0", red: "#e8302f", yellow: "#f5c400" };

// Chosen in the lesson view, kept in this browser only.
function readSaved(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}
function writeSaved(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked. The page still works without it.
  }
}

// Saves a text file to the viewer's downloads.
function saveText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function lessonText(L) {
  const lines = [L.title + (L.draft ? " (DRAFT, not yet checked)" : ""), L.sport + " · " + L.phase, "Formation: " + L.formText, ""];
  for (const a of AGES.filter((x) => x !== "1-2")) {
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

// Formation drawn to a common grid: cones, then players.
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

const SUBTABS = [
  { key: "library", label: "Lesson library" },
  { key: "lessons", label: "Term 1 plan" },
  { key: "programmes", label: "Programmes and skills" },
  { key: "expectations", label: "Coach expectations" },
];

const panel = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 18, minWidth: 0 };
const chipBase = { border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit", padding: "5px 12px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const chipOn = { ...chipBase, background: "#f4eee8", color: "#151210", border: "1px solid #f4eee8" };

// Lesson library: five sports, three age groups, five lessons each.
function LessonLibrary() {
  const [sportKey, setSportKey] = useState("netball");
  const [age, setAge] = useState("4–6");
  const [open, setOpen] = useState(null);
  const sport = SPORTS.find((s) => s.key === sportKey) || SPORTS[0];
  const lessons = lessonsFor(sport, age);
  const lesson = open ? lessons[open - 1] : null;

  function downloadLesson(L) {
    const lines = [sport.name + " · " + L.title + " · focus: " + L.focus, "Ages " + age + " years", ""];
    for (const x of L.flow) {
      lines.push(x.name + " (" + x.minutes + " min)" + (x.focus ? " · FOCUS" : ""));
      if (x.cue) lines.push("  Cue: " + x.cue);
      lines.push("  " + x.text, "");
    }
    lines.push("Equipment: " + sport.equipment, "Coach tips: " + COACH_TIPS);
    saveText("Curriculum-" + sport.name + "-" + age + "-" + L.title.replace(/\s+/g, "-") + ".txt", lines.join("\n"));
  }

  return (
    <div>
      <div role="group" aria-label="Sport" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {SPORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={s.key === sportKey}
            onClick={() => {
              setSportKey(s.key);
              setOpen(null);
            }}
            style={{
              ...chipBase,
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...(s.key === sportKey ? { background: s.colour, border: "1px solid " + s.colour, color: "#fff" } : {}),
            }}
          >
            <img src={s.picto} alt="" style={{ width: 28, height: 28, objectFit: "contain", background: "#fff", borderRadius: 6 }} />
            {s.name}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Age group" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {AGE_GROUPS.map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={a === age}
            onClick={() => {
              setAge(a);
              setOpen(null);
            }}
            style={{
              ...chipBase,
              border: "1px solid " + AGE_COLOUR[a],
              background: a === age ? AGE_COLOUR[a] : "transparent",
              color: a === age ? (a === "2–4" ? "#151210" : "#ffffff") : "inherit",
            }}
          >
            {a} years
          </button>
        ))}
      </div>

      {!lesson && (
        <>
          <div style={{ ...panel, marginBottom: 14, borderTop: "4px solid " + sport.colour }}>
            <h4 style={{ margin: "0 0 6px", fontSize: 20, textTransform: "uppercase" }}>I should be able to… (ages {age})</h4>
            <ul style={{ margin: 0, paddingLeft: 20, columns: 2 }}>
              {sport.abilities[age].map((x) => (
                <li key={x} style={{ margin: "2px 0" }}>{x}</li>
              ))}
            </ul>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {lessons.map((L) => {
              const focus = sport.blocks[L.number - 1];
              return (
                <button
                  key={L.number}
                  type="button"
                  onClick={() => setOpen(L.number)}
                  style={{ ...panel, textAlign: "left", cursor: "pointer", color: "inherit", padding: 12 }}
                >
                  <img src={focus.img} alt={focus.name + " illustration"} style={{ width: "100%", height: 120, objectFit: "contain", background: "#fbf8f1", borderRadius: 10 }} />
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: sport.colour }}>
                    Lesson {L.number} · 30 min
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{focus.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.75, fontStyle: "italic" }}>{focus.cue}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {lesson && (
        <article style={panel}>
          <button type="button" className="back-link" onClick={() => setOpen(null)} style={{ marginBottom: 10 }}>
            ← All {sport.name.toLowerCase()} lessons, ages {age}
          </button>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <img src={sport.picto} alt={sport.name + " pictogram"} style={{ width: 84, height: 84, objectFit: "contain", background: "#fff", borderRadius: 14, padding: 6 }} />
            <div>
              <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>
                {sport.name} · ages {age} · {lesson.total} minutes
              </div>
              <h3 style={{ margin: "2px 0 0", fontSize: 30, textTransform: "uppercase" }}>
                {lesson.title}: {lesson.focus}
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", margin: "14px 0 16px", border: "1px solid rgba(255,255,255,0.12)" }} aria-label="Lesson timeline">
            {lesson.flow.map((x, i) => (
              <div
                key={i}
                title={x.name + " · " + x.minutes + " min"}
                style={{
                  flex: x.minutes,
                  background: x.focus ? sport.colour : x.name === "Warm-up" || x.name === "Wrap-up" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.28)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  padding: "0 4px",
                }}
              >
                {x.minutes >= 3 ? x.minutes + "′" : ""}
              </div>
            ))}
          </div>

          {lesson.flow.map((x, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: x.img ? "minmax(0, 170px) minmax(0, 1fr)" : "minmax(0, 1fr)",
                gap: 14,
                alignItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                padding: "12px 0",
                background: x.focus ? "rgba(255,255,255,0.04)" : "transparent",
              }}
            >
              {x.img && (
                <img src={x.img} alt={x.name + " illustration"} style={{ width: "100%", height: 110, objectFit: "contain", background: "#fbf8f1", borderRadius: 10 }} />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, textTransform: "uppercase" }}>
                  {x.name} <span style={{ fontWeight: 600, fontSize: 13, opacity: 0.75 }}>· {x.minutes} min{x.focus ? " · focus" : ""}</span>
                </div>
                {x.cue ? <div style={{ fontStyle: "italic", fontSize: 14, color: sport.colour, margin: "2px 0 4px", filter: "brightness(1.4)" }}>“{x.cue}”</div> : null}
                <div>{x.gameName ? <b>{x.gameName}: </b> : null}{x.text}</div>
              </div>
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 8 }}>
            <div style={{ ...panel, padding: 12 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 18, textTransform: "uppercase" }}>Set-up</h4>
              <img src={sport.setup} alt={sport.name + " set-up diagram"} style={{ width: "100%", height: "auto", borderRadius: 10, background: "#fbf8f1" }} />
              <p style={{ fontSize: 13, margin: "6px 0 0", opacity: 0.8 }}>One station per child. Spread out, set distances for the age group, and the coach stands in the middle.</p>
              <p style={{ fontSize: 13, margin: "6px 0 0" }}><b>Equipment:</b> {sport.equipment}</p>
            </div>
            <div style={{ ...panel, padding: 12 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 18, textTransform: "uppercase" }}>Easier</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {sport.regressions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <h4 style={{ margin: "12px 0 6px", fontSize: 18, textTransform: "uppercase" }}>Harder</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {sport.progressions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p style={{ fontSize: 13, margin: "12px 0 0", opacity: 0.8 }}>{COACH_TIPS}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
            <button
              type="button"
              style={{ ...chipBase, background: "#e8302f", border: "1px solid #e8302f", color: "#fff" }}
              onClick={() => downloadLesson(lesson)}
            >
              Download this lesson
            </button>
            <span style={{ fontSize: 13, opacity: 0.7 }}>Timings are rebalanced to 30 minutes, with the focus block longer.</span>
          </div>
        </article>
      )}
    </div>
  );
}

export default function CurriculumBoard() {
  const [section, setSection] = useState("library");
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

  let ageBody = null;
  if (lesson) {
    if (age === "1-2") ageBody = <p style={{ fontStyle: "italic", opacity: 0.75 }}>{WAIT_1_2}</p>;
    else if (!lesson.ages[age]) ageBody = <p style={{ fontStyle: "italic", opacity: 0.75 }}>{WAIT}</p>;
    else
      ageBody = (
        <>
          {lesson.ages[age].map((s, i) => (
            <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "12px 0" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: 18, textTransform: "uppercase" }}>{s.t}</h4>
              {s.b ? <p style={{ margin: "0 0 6px" }}>{s.b}</p> : null}
              {s.l.length ? (
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                  {s.l.map((x, j) => (
                    <li key={j} style={{ margin: "2px 0" }}>{x}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "12px 0" }}>{lesson.finish}</div>
        </>
      );
  }

  return (
    <div>
      <h3 className="section-title">Curriculum</h3>
      <p className="section-subtitle">
        Five lessons per age group for netball, rugby, soccer, hockey and tennis, for ages 2–4, 4–6 and 7+. Lessons marked
        Draft have not yet been checked by the coach lead.
      </p>

      <div role="tablist" aria-label="Curriculum sections" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 18px" }}>
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={section === t.key}
            style={section === t.key ? chipOn : chipBase}
            onClick={() => setSection(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "library" && <LessonLibrary />}

      {section === "lessons" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)", gap: 18, alignItems: "start" }} className="curriculum-layout">
          <div>
            {(() => {
              const rows = [];
              let lastBlock = null;
              let sessionNo = 0;
              TERM.forEach((w, i) => {
                if (w.b !== lastBlock) {
                  lastBlock = w.b;
                  sessionNo = 0;
                  rows.push(
                    <h4 key={"b" + i} style={{ margin: "14px 0 6px", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ff9a9d" }}>
                      {BLOCKS[w.b].name}
                    </h4>
                  );
                }
                sessionNo += 1;
                const L = w.lesson ? LESSONS[w.lesson] : null;
                rows.push(
                  <button
                    key={"w" + i}
                    type="button"
                    disabled={!L}
                    aria-current={L && selected === w.lesson ? "true" : undefined}
                    onClick={() => L && openLesson(w.lesson)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginBottom: 6,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: selected && L && selected === w.lesson ? "2px solid #e8302f" : "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.03)",
                      color: "inherit",
                      cursor: L ? "pointer" : "default",
                      opacity: L ? 1 : 0.7,
                    }}
                  >
                    <strong>{L ? L.title : "Session " + sessionNo}</strong>
                    {L && L.draft ? <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: "#3a3115", color: "#f2c26b" }}>Draft</span> : null}
                    <div style={{ fontSize: 13, opacity: 0.75 }}>{L ? (w.phase || L.phase) + " · " + L.sport : w.note}</div>
                  </button>
                );
              });
              return rows;
            })()}
            <button
              type="button"
              className="back-link"
              style={{ marginTop: 10 }}
              onClick={() => {
                saveText("Term-1-curriculum.txt", termText());
                setStatus("Term plan downloaded.");
              }}
            >
              Download the whole term
            </button>
            {section === "lessons" && status && !selected ? <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>{status}</div> : null}
          </div>

          <article style={panel}>
            {!lesson ? (
              <p style={{ opacity: 0.75, fontStyle: "italic" }}>Choose a lesson from the term plan.</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 6 }}>
                  <img
                    src={PICTO[lesson.sport].src}
                    alt={PICTO[lesson.sport].alt}
                    style={{ width: 96, height: 96, flex: "none", objectFit: "contain", background: "#fff", borderRadius: 14, padding: 6 }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 30, textTransform: "uppercase" }}>{lesson.title}</h3>
                    <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
                      {lesson.sport} · {lesson.phase}
                      {lesson.draft ? " · Draft, not yet checked" : " · Coaches' sheet"}
                    </div>
                  </div>
                </div>

                <div role="group" aria-label="Age group" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
                  {AGES.map((a) => (
                    <button key={a} type="button" aria-pressed={age === a} style={age === a ? chipOn : chipBase} onClick={() => setAge(a)}>
                      {a} years
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 260px) minmax(0, 1fr)", gap: 16, alignItems: "center", marginBottom: 8 }}>
                  <figure style={{ margin: 0, background: "#e9f4e6", borderRadius: 12, padding: 8 }}>
                    <Formation form={lesson.form} label={lesson.formText} />
                    <figcaption style={{ fontSize: 12, color: "#3b3b3b", textAlign: "center", marginTop: 4 }}>{lesson.formText}</figcaption>
                  </figure>
                  <p style={{ margin: 0 }}>
                    <strong>Formation:</strong> {lesson.formText}
                    <br />
                    <span style={{ fontSize: 13, opacity: 0.7 }}>The diagram is a guide. Adjust the space to your training area.</span>
                  </p>
                </div>

                {ageBody}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "12px 0" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: 18, textTransform: "uppercase" }}>Equipment</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "6px 14px" }}>
                    {EQUIP[lesson.sport].map((e, i) => (
                      <label key={e} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={!!(current.checks && current.checks[i])}
                          onChange={(ev) => updateSaved({ checks: { ...(current.checks || {}), [i]: ev.target.checked } })}
                          style={{ width: 18, height: 18, accentColor: "#e8302f" }}
                        />
                        {e}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "12px 0" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: 18, textTransform: "uppercase" }}>Notes</h4>
                  <textarea
                    aria-label="Notes for this lesson"
                    value={current.notes || ""}
                    onChange={(ev) => updateSaved({ notes: ev.target.value })}
                    placeholder="What worked, what to change next time"
                    style={{ width: "100%", minHeight: 90, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit", padding: 10, font: "inherit" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    style={{ ...chipBase, background: "#e8302f", border: "1px solid #e8302f", color: "#fff" }}
                    onClick={() => {
                      saveText("Curriculum-" + lesson.title.replace(/\s+/g, "-") + ".txt", lessonText(lesson));
                      setStatus("Lesson downloaded.");
                    }}
                  >
                    Download this lesson
                  </button>
                  {status && selected ? <span style={{ fontSize: 13, opacity: 0.75 }}>{status}</span> : null}
                </div>
              </>
            )}
          </article>
        </div>
      )}

      {section === "programmes" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div style={panel}>
            <h4 style={{ margin: "0 0 6px", fontSize: 20, textTransform: "uppercase", color: "#ff9a9d" }}>Junior programmes</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><b>Baby programme, 1–2 years:</b> sport-themed physical development that builds a strong motor-skill foundation before the toddler programme.</li>
              <li><b>Toddler programme, 2–3 years:</b> sport-themed physical development that uses a wider range of sports equipment, and introduces sport terms and the how-to's.</li>
            </ul>
          </div>
          <div style={panel}>
            <h4 style={{ margin: "0 0 6px", fontSize: 20, textTransform: "uppercase", color: "#ff9a9d" }}>Foundation programmes</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><b>Initial programme, 4–6 years:</b> physical development continues, but the programme is more sport-specific. Students learn to work in pairs.</li>
              <li><b>Elementary programme, 7+:</b> students apply their skills in a competitive setting and learn the values that apply to sport.</li>
            </ul>
          </div>
          <div style={panel}>
            <h4 style={{ margin: "0 0 6px", fontSize: 20, textTransform: "uppercase", color: "#ff9a9d" }}>Skills for the junior programmes</h4>
            <p style={{ margin: "0 0 6px", fontSize: 14, opacity: 0.8 }}>From the 2023 curriculum map.</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Balance, coordination, strength, cardio</li>
              <li>Bilateral integration, flexibility, motor planning</li>
              <li>Manipulation skills, proprioception</li>
            </ul>
          </div>
          <div style={panel}>
            <h4 style={{ margin: "0 0 6px", fontSize: 20, textTransform: "uppercase", color: "#ff9a9d" }}>Four phases of progression</h4>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li><b>Phase 1:</b> basic skills</li>
              <li><b>Phase 2:</b> partner work</li>
              <li><b>Phase 3:</b> combination skills and drills</li>
              <li><b>Phase 4:</b> game play</li>
            </ol>
          </div>
          <div style={panel}>
            <h4 style={{ margin: "0 0 6px", fontSize: 20, textTransform: "uppercase", color: "#ff9a9d" }}>Other programmes</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Soccer Saturday: soccer club and B-Active tournaments</li>
              <li>Sport-specific coaching: private coaching and school sports</li>
              <li>Wellness programme: corporate and schools</li>
              <li>Holiday programmes: fun games and activities during school holidays</li>
              <li>Events: birthday parties, team buildings, leadership events, sports days, fun days, special days</li>
            </ul>
          </div>
        </div>
      )}

      {section === "expectations" && (
        <article style={panel}>
          <h4 style={{ margin: "0 0 6px", fontSize: 22, textTransform: "uppercase" }}>Expectations</h4>
          <ol style={{ paddingLeft: 22, margin: 0 }}>
            <li>Complete tasks delegated to you.</li>
            <li>Check in with all departments weekly to see where you can assist.</li>
            <li>Establish the communication line between the clients you deal with directly and the client relations department.</li>
            <li>Come into the office to touch base and put in the time.</li>
            <li>Maintain and keep track of your equipment and the equipment around you.</li>
            <li>Own your registers, and possibly other registers.</li>
            <li>Keep a journal of all your work, goals, plans and to-dos from all daily tasks. Include lesson plans and notes.</li>
          </ol>

          <h4 style={{ margin: "18px 0 6px", fontSize: 22, textTransform: "uppercase" }}>Work process</h4>
          <ul style={{ paddingLeft: 22, margin: 0 }}>
            <li><b>1 · Management:</b> respond to all communication from teammates and clients. Adjust and communicate your plan for the day with any new information. Prepare physically and mentally for your activities. Repeat 1, 2, 3 throughout the day.</li>
            <li><b>2 · Commitment:</b> coach and run events. Take pictures and videos, and make detailed notes in your journal. Communicate all feedback to your team and clients, the more visual and creative the better. Repack, clean, plan and prepare all resources for the next day.</li>
            <li><b>3 · Vision:</b> work on your projects: set goals, objectives, tasks and deadlines. Give and receive constructive feedback. Be creative and think outside the box. Your projects depend on your attitude, performance and results.</li>
            <li><b>4 · Improvement:</b> set personal goals and improve at all times. Stay in good health. Attend all training with enthusiasm. Focus on self-improvement, learn and practise new skills, and contribute to the team when asked.</li>
          </ul>

          <h4 style={{ margin: "18px 0 6px", fontSize: 22, textTransform: "uppercase" }}>Above and beyond</h4>
          <ul style={{ paddingLeft: 22, margin: 0 }}>
            <li>Set your own goals and present an action plan to reach them.</li>
            <li>Come up with new ideas for your team.</li>
            <li>Develop yourself by learning and researching new skills, in your own time.</li>
            <li>Always help your team with their tasks once yours are complete.</li>
            <li>Be an example for your team on and off the field, and encourage your team to be better every day.</li>
            <li>Promote the brand to everyone you know. Generate good leads by understanding what we do, and pass them to the correct team.</li>
          </ul>

          <h4 style={{ margin: "18px 0 6px", fontSize: 22, textTransform: "uppercase" }}>Day-to-day tasks</h4>
          <ul style={{ paddingLeft: 22, margin: 0 }}>
            <li><b>Communication:</b> check and respond to all WhatsApp messages and emails first thing. Repeat this throughout the day.</li>
            <li><b>Before the lesson:</b> arrive 20–30 minutes before the start. Check your registers (follow the 10-step register process). Go over the lesson plan. Check the register for new students and trials. Greet staff and students, confirm lesson times, and ask about their morning.</li>
            <li><b>Attendance:</b> red = absent. Orange = present but cannot attend (write the reason on the register, e.g. sick). Green = present.</li>
            <li><b>Trials and new students:</b> take an identification photo with the student's name, and keep it on your phone or Google Drive.</li>
            <li><b>Set up:</b> set up your area, and check the lightning alarm if the weather is unfavourable.</li>
          </ul>
        </article>
      )}
    </div>
  );
}
