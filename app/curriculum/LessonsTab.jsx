"use client";

import { useState } from "react";
import { SPORTS } from "../../lib/curriculumLibrary.js";
import { CURRICULUM_AGES } from "../../lib/curriculumAges.js";
import { SKILLS_2D } from "../../lib/skillsIllustrated.js";
import { WEEKLY_PLANS } from "../../lib/weeklyPlans/index.js";
import { saveText } from "./shared.js";

// Pick a sport and an age group. What the children should be able to do is written
// out first, then the five lessons in order, then the same skills as illustrations.
export default function LessonsTab() {
  const [sportKey, setSportKey] = useState("netball");
  const [ageKey, setAgeKey] = useState("4–6");
  const sport = SPORTS.find((s) => s.key === sportKey) || SPORTS[0];
  const age = CURRICULUM_AGES.find((a) => a.key === ageKey) || CURRICULUM_AGES[1];
  const lessons = WEEKLY_PLANS.map((w, i) => ({ number: i + 1, plan: w.sports[sport.key] }));
  const skills = SKILLS_2D[sport.key][age.key];

  function downloadLesson(lesson) {
    const lines = [`${sport.name} · Lesson ${lesson.number} · ${age.label}`, `Focus: ${lesson.plan.focus}`, ""];
    if (lesson.plan.tips?.length) {
      lines.push("Coaching tips:");
      for (const t of lesson.plan.tips) lines.push(`- ${t}`);
      lines.push("");
    }
    lines.push("Activities:");
    (lesson.plan.ages[age.plan] || []).forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    saveText(`${sport.name}-lesson-${lesson.number}-${age.key}.txt`.toLowerCase(), lines.join("\n"));
  }

  return (
    <div>
      <div className="cur-filters">
        <div className="tab-strip" role="tablist" aria-label="Sport">
          {SPORTS.map((s) => {
            const on = s.key === sport.key;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={on}
                className={`tab-pill${on ? " active" : ""}`}
                style={on ? { background: s.colour, borderColor: s.colour } : undefined}
                onClick={() => setSportKey(s.key)}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="tab-strip" role="tablist" aria-label="Age group">
          {CURRICULUM_AGES.map((a) => (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={a.key === age.key}
              className={`tab-pill${a.key === age.key ? " active" : ""}`}
              onClick={() => setAgeKey(a.key)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <p className="section-subtitle">{age.source}</p>

      <div className="card cur-sport">
        <img src={sport.setup} alt={`${sport.name} set-up`} className="cur-setup" />
        <div>
          <h3 className="section-title">{sport.name}</h3>
          <p style={{ margin: 0 }}>
            <strong>Equipment:</strong> {sport.equipment}
          </p>
        </div>
      </div>


      <h3 className="section-title" style={{ marginTop: "1.5rem" }}>
        Five lessons
      </h3>
      {lessons.map((lesson) => {
        const activities = lesson.plan.ages[age.plan] || [];
        return (
          <details key={lesson.number} className="card cur-lesson" open={lesson.number === 1}>
            <summary>
              Lesson {lesson.number} <span>· {lesson.plan.focus}</span>
            </summary>

            <h4 className="cur-heading">Activities</h4>
            <ol className="cur-activities">
              {activities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>

            {lesson.plan.tips?.length ? (
              <>
                <h4 className="cur-heading">Coaching tips</h4>
                <ul className="cur-activities">
                  {lesson.plan.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <button type="button" className="back-link" onClick={() => downloadLesson(lesson)}>
              Download this lesson
            </button>
          </details>
        );
      })}

      <h3 className="section-title" style={{ marginTop: "1.5rem" }}>
        What I should be able to do ({age.key})
      </h3>
      <p className="section-subtitle">Each card shows a skill the child needs to demonstrate, with what it looks like.</p>
      <div className="cur-skills">
        {skills.map((s) => (
          <figure key={s.name} className="card cur-skill">
            <img src={s.img} alt={s.name} loading="lazy" />
            <figcaption>
              <strong>{s.name}</strong>
              <span>{s.description}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
