"use client";

import { useEffect, useState } from "react";

// Same click-to-drill-down pattern as the top-level board landing page,
// one level deeper: a board is a grid of topic tiles, and a topic's
// numbers only render once you click into it — never all at once.
//
// jumpSignal lets a caller open a specific topic programmatically (e.g. an
// "Edit" button elsewhere on the board) instead of only via a tile click —
// pass a fresh object ({ key }) each time, even to jump to the same topic
// twice in a row; object identity, not the key value, is what re-triggers
// the effect below. Optional — every existing caller that doesn't pass it
// behaves exactly as before.
export default function TopicBoard({ topics, jumpSignal }) {
  const [topicKey, setTopicKey] = useState(null);
  const active = topics.find((t) => t.key === topicKey);

  useEffect(() => {
    if (jumpSignal) setTopicKey(jumpSignal.key);
  }, [jumpSignal]);

  if (!active) {
    return (
      <div className="board-landing">
        {topics.map((t) => (
          <button
            key={t.key}
            className="board-tile"
            onClick={() => setTopicKey(t.key)}
            type="button"
          >
            <span className="board-tile-label">{t.label}</span>
            {t.description && <span className="board-tile-desc">{t.description}</span>}
            <span className="board-tile-arrow">Open →</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button className="back-link" onClick={() => setTopicKey(null)} type="button">
        ← Back to topics
      </button>
      <section className="section">
        <h2 className="section-title">{active.label}</h2>
        {active.render()}
      </section>
    </div>
  );
}
