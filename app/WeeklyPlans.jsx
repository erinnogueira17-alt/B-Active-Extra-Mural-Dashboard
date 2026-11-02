"use client";

import { useState } from "react";
import { SPORTS } from "../lib/curriculumLibrary.js";
import { WEEKLY_PLANS, WEEKLY_AGES, GAME_PLAY_COACHING } from "../lib/weeklyPlans/index.js";

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
    // Download is a convenience; the plan is still shown on the page.
  }
}

// The weekly plans from the B-Active sheets. Pick a week, a sport and an age
// group. Each plan lists the focus, any coaching tips, and the activities in
// order as written on the sheet.
export default function WeeklyPlans() {
  const [weekNo, setWeekNo] = useState(WEEKLY_PLANS[0].week);
  const [sportKey, setSportKey] = useState("netball");
  const [age, setAge] = useState("4-6");
  const week = WEEKLY_PLANS.find((w) => w.week === weekNo) || WEEKLY_PLANS[0];
  const sport = SPORTS.find((s) => s.key === sportKey) || SPORTS[0];
  const plan = week.sports[sport.key];
  const ageLabel = WEEKLY_AGES.find((a) => a.key === age)?.label || age;
  const activities = plan.ages[age] || [];

  function downloadPlan() {
    const lines = [
      `${sport.name} · Week ${week.week} · ${ageLabel}`,
      `Focus: ${plan.focus}`,
      "",
    ];
    if (plan.tips?.length) {
      lines.push("Coaching tips:");
      for (const t of plan.tips) lines.push(`- ${t}`);
      lines.push("");
    }
    lines.push("Activities:");
    activities.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push("", `Source: ${week.source}`);
    saveText(`${sport.name}-week-${week.week}-${age}.txt`.toLowerCase(), lines.join("\n"));
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={panel}>
        <div style={label}>Week</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {WEEKLY_PLANS.map((w) => (
            <button
              key={w.week}
              type="button"
              onClick={() => setWeekNo(w.week)}
              style={weekNo === w.week ? chipOn : chipBase}
              aria-pressed={weekNo === w.week}
            >
              Week {w.week}
            </button>
          ))}
        </div>

        <div style={{ ...label, marginTop: 16 }}>Sport</div>
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
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>
            {sport.name} · Week {week.week} · {ageLabel}
          </h3>
          <button type="button" onClick={downloadPlan} style={chipBase}>
            Download plan
          </button>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 14, opacity: 0.85 }}>
          <strong>Focus:</strong> {plan.focus}
        </p>

        {plan.tips?.length ? (
          <div style={{ marginTop: 14 }}>
            <div style={label}>Coaching tips</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
              {plan.tips.map((t) => (
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

        <p style={{ margin: "14px 0 0", fontSize: 12, opacity: 0.6 }}>Source: {week.source}</p>
      </div>

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
