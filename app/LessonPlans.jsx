"use client";

import { useState } from "react";
import { SPORTS } from "../lib/curriculumLibrary.js";
import { WEEKLY_PLANS, WEEKLY_AGES, GAME_PLAY_COACHING } from "../lib/weeklyPlans/index.js";
import { LESSON_PICTURES } from "../lib/weeklyPlans/pictures.js";

const chipBase = { border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit", padding: "5px 12px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const chipOn = { ...chipBase, background: "#f4eee8", color: "#151210", border: "1px solid #f4eee8" };
const panel = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 18, minWidth: 0 };
const label = { fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.7, marginBottom: 8 };

function saveText(filename, text) {
  try {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Download is a convenience; the lesson is still shown on the page.
  }
}

// Lesson plans by sport, then age group. Each age group has five lessons that
// build on each other, in the order the lessons are numbered below.
export default function LessonPlans() {
  const [sportKey, setSportKey] = useState("netball");
  const [age, setAge] = useState("4-6");
  const sport = SPORTS.find((s) => s.key === sportKey) || SPORTS[0];
  const ageLabel = WEEKLY_AGES.find((a) => a.key === age)?.label || age;
  const lessons = WEEKLY_PLANS.map((w, i) => ({ number: i + 1, plan: w.sports[sport.key] }));

  function downloadLesson(lesson) {
    const pictures = LESSON_PICTURES[`${sport.key}|${age}|${lesson.number}`] || [];
    const lines = [
      `${sport.name} · Lesson ${lesson.number} · ${ageLabel}`,
      `Focus: ${lesson.plan.focus}`,
      "",
    ];
    if (lesson.plan.tips?.length) {
      lines.push("Coaching tips:");
      for (const t of lesson.plan.tips) lines.push(`- ${t}`);
      lines.push("");
    }
    lines.push("Activities:");
    (lesson.plan.ages[age] || []).forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    if (pictures.length) lines.push("", `Illustrations: ${pictures.length} (on the Curriculum tab)`);
    saveText(`${sport.name}-lesson-${lesson.number}-${age}.txt`.toLowerCase(), lines.join("\n"));
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={panel}>
        <div style={label}>Sport</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SPORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSportKey(s.key)}
              style={sportKey === s.key ? { ...chipOn, background: s.colour, border: `1px solid ${s.colour}`, color: "#fff" } : chipBase}
              aria-pressed={sportKey === s.key}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div style={{ ...label, marginTop: 16 }}>Age group</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {WEEKLY_AGES.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setAge(a.key)}
              style={age === a.key ? chipOn : chipBase}
              aria-pressed={age === a.key}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ margin: 0, fontSize: 20 }}>
          {sport.name} · {ageLabel}
        </h3>
        <div style={{ ...label, marginTop: 14 }}>Progression across the five lessons</div>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {lessons.map((l) => (
            <li key={l.number} style={{ borderLeft: `3px solid ${sport.colour}`, paddingLeft: 10, fontSize: 13, lineHeight: 1.45 }}>
              <strong>Lesson {l.number}</strong>
              <div style={{ opacity: 0.85 }}>{l.plan.focus}</div>
            </li>
          ))}
        </ol>
      </div>

      {lessons.map((lesson) => {
        const pictures = LESSON_PICTURES[`${sport.key}|${age}|${lesson.number}`] || [];
        const activities = lesson.plan.ages[age] || [];
        return (
          <div key={lesson.number} style={panel}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 18 }}>Lesson {lesson.number}</h4>
              <button type="button" onClick={() => downloadLesson(lesson)} style={chipBase}>
                Download lesson
              </button>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.85 }}>
              <strong>Focus:</strong> {lesson.plan.focus}
            </p>

            {pictures.length ? (
              <div style={{ display: "grid", gap: 8, marginTop: 14, gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                {pictures.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${sport.name} illustration, lesson ${lesson.number}, ${ageLabel}`}
                    loading="lazy"
                    style={{ width: "100%", height: "auto", borderRadius: 10, background: "#fff" }}
                  />
                ))}
              </div>
            ) : null}

            {lesson.plan.tips?.length ? (
              <div style={{ marginTop: 14 }}>
                <div style={label}>Coaching tips</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
                  {lesson.plan.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ marginTop: 14 }}>
              <div style={label}>Activities</div>
              <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5 }}>
                {activities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </div>
          </div>
        );
      })}

      <details style={panel}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Game-play coaching guide</summary>
        <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>Theme: {GAME_PLAY_COACHING.theme}.</strong> &ldquo;{GAME_PLAY_COACHING.quote}&rdquo;
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
            {GAME_PLAY_COACHING.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {GAME_PLAY_COACHING.tips.map((t) => (
              <div key={t.title}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
                  {t.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>{GAME_PLAY_COACHING.ifUnsure}</p>
        </div>
      </details>
    </section>
  );
}
