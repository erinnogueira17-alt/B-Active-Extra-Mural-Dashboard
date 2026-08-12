"use client";

import { useState } from "react";
import OverviewBoard from "./OverviewBoard.jsx";
import EnrolmentBoard from "./EnrolmentBoard.jsx";
import CurrentStateBoard from "./CurrentStateBoard.jsx";

const BOARDS = [
  { key: "overview", label: "Overview" },
  { key: "enrolment", label: "Enrolment" },
  { key: "current-state", label: "Current State" },
];

export default function AppShell({ growth, currentState }) {
  const [board, setBoard] = useState("overview");

  const anyLive = growth.source === "live" || currentState.source === "live";
  const bothLive = growth.source === "live" && currentState.source === "live";

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>B-Active Group Ops Dashboard</h1>
          <p>Enrolment funnel and current-state roster, JHB &amp; CPT.</p>
        </div>
      </header>

      {bothLive ? (
        <div className="banner live">
          Live data — last synced{" "}
          {new Date(growth.syncedAt || currentState.syncedAt).toLocaleString()}.
        </div>
      ) : anyLive ? (
        <div className="banner live">
          Partially live — {growth.source === "live" ? "Enrolment" : "Current State"} data is
          synced, the other board is still showing seed data (no sync has run for it yet).
        </div>
      ) : (
        <div className="banner seed">
          Showing seed data — no nightly sync has run yet. Numbers below are honest
          placeholders, not real figures, until a sync succeeds.
        </div>
      )}

      <nav className="board-nav">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            className={`board-nav-item${board === b.key ? " active" : ""}`}
            onClick={() => setBoard(b.key)}
            type="button"
          >
            {b.label}
          </button>
        ))}
      </nav>

      {board === "overview" && (
        <OverviewBoard growth={growth} currentState={currentState} onNavigate={setBoard} />
      )}
      {board === "enrolment" && <EnrolmentBoard data={growth.data} />}
      {board === "current-state" && <CurrentStateBoard data={currentState.data} />}
    </div>
  );
}
