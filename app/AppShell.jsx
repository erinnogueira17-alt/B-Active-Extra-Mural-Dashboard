"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OverviewBoard from "./OverviewBoard.jsx";
import EnrolmentBoard from "./EnrolmentBoard.jsx";
import CurrentStateBoard from "./CurrentStateBoard.jsx";
import LandingSummary from "./LandingSummary.jsx";

const BOARDS = [
  {
    key: "current-state",
    label: "Current State",
    description: "The roster right now — paying vs. non-paying players, revenue, schools.",
  },
  {
    key: "overview",
    label: "Overview",
    description: "Season snapshot and comparisons across Current State and Enrolment.",
  },
  {
    key: "enrolment",
    label: "Enrolment",
    description: "Intentions, Enrolments & B-less — month to date, year to date, any month.",
  },
];

// Three big clickable board tiles below the landing summary — the entry
// point into deeper detail. The summary itself gives the basic numbers
// with no clicking required; these tiles are for going further: a full
// topic, then a subtopic within it, then deeper still.
function BoardTiles({ onNavigate }) {
  return (
    <div className="board-landing">
      {BOARDS.map((b) => (
        <button
          key={b.key}
          className="board-tile"
          onClick={() => onNavigate(b.key)}
          type="button"
        >
          <span className="board-tile-label">{b.label}</span>
          <span className="board-tile-desc">{b.description}</span>
          <span className="board-tile-arrow">Open →</span>
        </button>
      ))}
    </div>
  );
}

// Lets anyone viewing the dashboard force an immediate re-pull from the
// Google Sheets instead of waiting for the next hourly cron run. Hits
// /api/manual-sync (which runs the same two sync jobs the cron calls,
// server-side, without ever exposing the cron secret to the browser), then
// router.refresh() re-renders the current server components against the
// freshly-synced blob data — no full page reload needed.
function SyncNowButton() {
  const router = useRouter();
  const [state, setState] = useState("idle"); // idle | syncing | error

  async function handleClick() {
    setState("syncing");
    try {
      const res = await fetch("/api/manual-sync", { method: "POST" });
      const body = await res.json().catch(() => ({ ok: false }));
      if (!body.ok) throw new Error("Sync failed");
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <button
      className="sync-now-button"
      onClick={handleClick}
      disabled={state === "syncing"}
      type="button"
    >
      {state === "syncing" ? "Syncing…" : state === "error" ? "Sync failed — retry" : "Sync now"}
    </button>
  );
}

export default function AppShell({ growth, currentState, currentStateHistory }) {
  const [board, setBoard] = useState(null);

  const anyLive = growth.source === "live" || currentState.source === "live";

  return (
    <div className="page">
      <header className="app-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="app-logo" src="/bactive-logo.png" alt="B-Active logo" />
        <div>
          <button className="app-title-button" onClick={() => setBoard(null)} type="button">
            <h1>B-Active Group Ops Dashboard</h1>
          </button>
          <p>Enrolment funnel and current-state roster, JHB &amp; CPT.</p>
        </div>
      </header>

      {board && (
        <nav className="board-nav">
          <button className="board-nav-item" onClick={() => setBoard(null)} type="button">
            ← Boards
          </button>
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
      )}

      {!board && (
        <div className="landing-page">
          <section className="section">
            <h2 className="section-title">Basic information</h2>
            <LandingSummary growth={growth} currentState={currentState} />
          </section>
          <section className="section">
            <h2 className="section-title">Go deeper</h2>
            <BoardTiles onNavigate={setBoard} />
          </section>
        </div>
      )}

      {board === "overview" && <OverviewBoard growth={growth} currentState={currentState} />}
      {board === "enrolment" && <EnrolmentBoard data={growth.data} />}
      {board === "current-state" && (
        <CurrentStateBoard
          data={currentState.data}
          growth={growth.data}
          history={currentStateHistory?.data || []}
        />
      )}

      <footer className="sync-footer">
        <span>
          {anyLive
            ? `Last synced ${new Date(growth.syncedAt || currentState.syncedAt).toLocaleString()}`
            : "Not yet synced — showing seed data"}
        </span>
        <SyncNowButton />
      </footer>
    </div>
  );
}
