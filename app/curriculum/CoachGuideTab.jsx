"use client";

import { GAME_PLAY_COACHING } from "../../lib/weeklyPlans/index.js";

const EXPECTATIONS = [
  "Complete tasks delegated to you.",
  "Check in with all departments weekly to see where you can assist.",
  "Establish the communication line between the clients you deal with directly and the client relations department.",
  "Come into the office to touch base and put in the time.",
  "Maintain and keep track of your equipment and the equipment around you.",
  "Own your registers, and possibly other registers.",
  "Keep a journal of all your work, goals, plans and to-dos from all daily tasks. Include lesson plans and notes.",
];

const WORK_PROCESS = [
  "1 · Management: respond to all communication from teammates and clients. Adjust and communicate your plan for the day with any new information. Prepare physically and mentally for your activities. Repeat 1, 2, 3 throughout the day.",
  "2 · Commitment: coach and run events. Take pictures and videos, and make detailed notes in your journal. Communicate all feedback to your team and clients, the more visual and creative the better. Repack, clean, plan and prepare all resources for the next day.",
  "3 · Vision: work on your projects: set goals, objectives, tasks and deadlines. Give and receive constructive feedback. Be creative and think outside the box. Your projects depend on your attitude, performance and results.",
  "4 · Improvement: set personal goals and improve at all times. Stay in good health. Attend all training with enthusiasm. Focus on self-improvement, learn and practise new skills, and contribute to the team when asked.",
];

const ABOVE_AND_BEYOND = [
  "Set your own goals and present an action plan to reach them.",
  "Come up with new ideas for your team.",
  "Develop yourself by learning and researching new skills, in your own time.",
  "Always help your team with their tasks once yours are complete.",
  "Be an example for your team on and off the field, and encourage your team to be better every day.",
  "Promote the brand to everyone you know. Generate good leads by understanding what we do, and pass them to the correct team.",
];

const DAY_TO_DAY = [
  "Communication: check and respond to all WhatsApp messages and emails first thing. Repeat this throughout the day.",
  "Before the lesson: arrive 20–30 minutes before the start. Check your registers (follow the 10-step register process). Go over the lesson plan. Check the register for new students and trials. Greet staff and students, confirm lesson times, and ask about their morning.",
  "Attendance: red = absent. Orange = present but cannot attend (write the reason on the register, e.g. sick). Green = present.",
  "Trials and new students: take an identification photo with the student's name, and keep it on your phone or Google Drive.",
  "Set up: set up your area, and check the lightning alarm if the weather is unfavourable.",
];

// Programmes, skills and the coach expectations. Plain reference text, so it is
// grouped into cards and the long expectations are collapsed.
export default function CoachGuideTab() {
  return (
    <div>
      <div className="card-grid cur-guide-grid">
        <section className="card">
          <h3 className="section-title">Junior programmes</h3>
          <ul className="cur-activities">
            <li><strong>Baby programme, 1–2 years:</strong> sport-themed physical development that builds a strong motor-skill foundation before the toddler programme.</li>
            <li><strong>Toddler programme, 2–3 years:</strong> sport-themed physical development that uses a wider range of sports equipment, and introduces sport terms and the how-to's.</li>
          </ul>
          <h3 className="section-title" style={{ marginTop: "1.25rem" }}>Foundation programmes</h3>
          <ul className="cur-activities">
            <li><strong>Initial programme, 4–6 years:</strong> physical development continues, but the programme is more sport-specific. Students learn to work in pairs.</li>
            <li><strong>Elementary programme, 7+:</strong> students apply their skills in a competitive setting and learn the values that apply to sport.</li>
          </ul>
        </section>

        <section className="card">
          <h3 className="section-title">Skills for the junior programmes</h3>
          <p className="cur-muted" style={{ marginTop: 0 }}>From the 2023 curriculum map.</p>
          <ul className="cur-activities">
            <li>Balance, coordination, strength, cardio</li>
            <li>Bilateral integration, flexibility, motor planning</li>
            <li>Manipulation skills, proprioception</li>
          </ul>
        </section>

        <section className="card">
          <h3 className="section-title">Four phases of progression</h3>
          <ol className="cur-activities">
            <li><strong>Phase 1:</strong> basic skills</li>
            <li><strong>Phase 2:</strong> partner work</li>
            <li><strong>Phase 3:</strong> combination skills and drills</li>
            <li><strong>Phase 4:</strong> game play</li>
          </ol>
        </section>

        <section className="card">
          <h3 className="section-title">Other programmes</h3>
          <ul className="cur-activities">
            <li>Soccer Saturday: soccer club and B-Active tournaments</li>
            <li>Sport-specific coaching: private coaching and school sports</li>
            <li>Wellness programme: corporate and schools</li>
            <li>Holiday programmes: fun games and activities during school holidays</li>
            <li>Events: birthday parties, team buildings, leadership events, sports days, fun days, special days</li>
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <h3 className="section-title">Game-play coaching guide</h3>
        <p style={{ margin: "0 0 0.5rem" }}>
          <strong>Theme: {GAME_PLAY_COACHING.theme}.</strong> &ldquo;{GAME_PLAY_COACHING.quote}&rdquo;
        </p>
        <ul className="cur-activities">
          {GAME_PLAY_COACHING.goals.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <div className="cur-guide-grid" style={{ marginTop: "1rem" }}>
          {GAME_PLAY_COACHING.tips.map((t) => (
            <div key={t.title}>
              <h4 className="cur-heading">{t.title}</h4>
              <ul className="cur-activities">
                {t.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="cur-muted" style={{ marginBottom: 0 }}>{GAME_PLAY_COACHING.ifUnsure}</p>
      </section>

      <section className="card" style={{ marginTop: "1.25rem" }}>
        <h3 className="section-title">Coach expectations</h3>
        <details className="cur-collapse" open>
          <summary>Expectations</summary>
          <ol className="cur-activities">
            {EXPECTATIONS.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ol>
        </details>
        <details className="cur-collapse">
          <summary>Work process</summary>
          <ul className="cur-activities">
            {WORK_PROCESS.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
        <details className="cur-collapse">
          <summary>Above and beyond</summary>
          <ul className="cur-activities">
            {ABOVE_AND_BEYOND.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
        <details className="cur-collapse">
          <summary>Day-to-day tasks</summary>
          <ul className="cur-activities">
            {DAY_TO_DAY.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
