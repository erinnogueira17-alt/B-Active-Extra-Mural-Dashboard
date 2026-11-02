"use client";

import { useState } from "react";
import LessonsTab from "./curriculum/LessonsTab.jsx";
import TermPlanTab from "./curriculum/TermPlanTab.jsx";
import CoachGuideTab from "./curriculum/CoachGuideTab.jsx";

const TABS = [
  { key: "lessons", label: "Lessons" },
  { key: "term", label: "Term plan" },
  { key: "guide", label: "Coach guide" },
];

// Curriculum: lessons by sport and age group, the term plan, and the coach guide.
export default function CurriculumBoard() {
  const [tab, setTab] = useState("lessons");
  return (
    <div>
      <h3 className="section-title">Curriculum</h3>
      <p className="section-subtitle">Lessons by sport and age group, the term plan, and the coach guide.</p>
      <div className="tab-strip" role="tablist" aria-label="Curriculum sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`tab-pill${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "lessons" && <LessonsTab />}
      {tab === "term" && <TermPlanTab />}
      {tab === "guide" && <CoachGuideTab />}
    </div>
  );
}
