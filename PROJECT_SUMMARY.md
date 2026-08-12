# B-Active Group Ops Dashboard — Project Summary

## What this is

An internal operations dashboard for B-Active Group, a company that runs
extra-mural sports coaching programs at pre/primary schools in Johannesburg
(JHB) and Cape Town (CPT). The dashboard gives staff a single place to see:

1. **Current State** — who's enrolled and paying *right now*: schools, coaches,
   paying player counts, revenue.
2. **Enrolment** — the season's trial → enrolment → churn funnel over time:
   Intentions (trial sign-ups), Enrolments (new paying players), B-less
   (players who left), broken down daily, weekly, monthly, and compared
   period-over-period.
3. **Overview** — a combined at-a-glance view of both, with links to jump into
   either board.

## Business context

- Season window tracked: **November 2025 – November 2026** (13 months).
- Three separate Google Forms feed the Enrolment numbers, each expected to
  have a 2025 archive tab and a 2026 live tab:
  - **Intentions** — trial sign-up form (has a "status of trial"-type column
    used to classify outcomes: enrolled / in progress / not enrolling /
    unreachable).
  - **Player Enrolment** — new paying player registrations.
  - **B-less** — departure/cancellation log, with a "reason for changing"
    column (multi-select, comma-separated).
  - A fourth tab inside the B-less sheet, **"Retention Calls Bee"**, tracks
    win-back call outcomes for a subset of B-less cases (pulled and stored,
    not yet surfaced in the UI).
- **Current State** numbers come from a different sheet, **"Live Dashboard
  2026"** — a school-by-school roster with head coach, paying/enrolled
  counts, and revenue, split into JHB and CPT sections plus a Soccer section.

## Architecture

- **Next.js 15 (App Router)**, deployed on **Vercel**.
- **Vercel Blob** stores two JSON snapshots (`growth-data.json`,
  `current-state-data.json`) — the "live" data. The page (`app/page.js`) is
  rendered dynamically per request and always tries to fetch the latest blob
  first; if that fails (blob missing, fetch error, sync never run), it falls
  back to a bundled seed JSON file so the site never shows a blank/broken
  page.
- **Two Vercel Cron Jobs** (`vercel.json`), both firing at `0 22 * * *` UTC
  (= 00:00 SAST), hit two API routes that pull fresh data from Google
  Sheets, aggregate it, and overwrite the two blobs:
  - `/api/sync-growth` — reads the three Enrolment sheets, aggregates by
    day/week/month, computes trial-outcome breakdowns and B-less reasons.
  - `/api/sync-current-state` — reads the Live Dashboard sheet, parses the
    school roster into per-coach and per-school rollups.
- **Google Sheets access** is via a **Google Cloud service account** (JWT
  signed manually with `node:crypto`, no `googleapis` package dependency) —
  the account's email must be shared as a Viewer on each of the four source
  sheets.
- Both sync routes are gated by a shared secret (`CRON_SECRET`), checked via
  an `Authorization: Bearer <secret>` header or a `?secret=` query param —
  this lets Vercel Cron call them automatically (Vercel injects the
  `Authorization` header for env vars literally named `CRON_SECRET`), and
  lets a human trigger a manual sync by visiting the URL with the secret.

### Required environment variables (Vercel → Project → Settings →
Environment Variables, Production scope)

| Variable | Purpose |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email for Sheets API auth |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key (PEM, with literal or escaped `\n` line breaks) |
| `CRON_SECRET` | Shared secret gating the two sync API routes |
| `GOOGLE_SHEET_ID_INTENTIONS` | Spreadsheet ID for the Intentions form |
| `GOOGLE_SHEET_ID_ENROLMENTS` | Spreadsheet ID for the Player Enrolment form |
| `GOOGLE_SHEET_ID_BLESS` | Spreadsheet ID for the B-less sheet |
| `GOOGLE_SHEET_ID_LIVE_DASHBOARD` | Spreadsheet ID for the Live Dashboard 2026 sheet |

All four sheet IDs are **required** — this build has no hardcoded fallback
IDs, unlike an earlier attempt at this project, because the real IDs weren't
available while rebuilding. Vercel Blob also needs a store connected
(auto-injects `BLOB_READ_WRITE_TOKEN`).

**Important:** env var changes in Vercel only take effect on the *next*
deployment — adding/changing one requires a fresh deploy, not just a page
reload.

## Current data status (as of this rebuild)

- **No real data has been synced.** Both seed files
  (`app/data/growth-fallback.json`, `app/data/current-state-fallback.json`)
  are honest placeholders — all months `null`, all lists empty, totals
  zero — not fabricated figures. The site correctly shows a "Showing seed
  data" banner until a real sync run succeeds.
- The Current State parser (`lib/currentStateAggregate.js`) uses
  header-keyword column detection and section-keyword detection (JHB/CPT/
  Soccer) rather than fixed column positions, since the real sheet's layout
  wasn't available to verify during this build. **This needs to be checked
  against the real "Live Dashboard 2026" sheet on the first sync** — if
  `parsed: false` comes back, or numbers look implausible, adjust the
  `COLUMN_KEYWORDS` / `SECTION_KEYWORDS` constants at the top of that file.
- The Enrolment sync auto-detects each sheet's 2025/2026 tabs by matching
  "2025"/"2026" in tab titles. If the real tabs are named differently, this
  needs adjusting in `fetchYearCombinedRows` (`app/api/sync-growth/route.js`).

## History

An earlier session built a full version of this dashboard (per its own
documentation: 19 source files, real seed data pulled from the sheets) but
that work was **never committed to a git repository** — it existed only in
that session's working memory and was deployed piecemeal via a Vercel tool
that replaces the entire production file tree per call. Repeated attempts
to hand-reconstruct all 19 files from memory into single deploy calls
dropped files each time, leaving production in a broken/inconsistent state
across ~20 deployments (see the `bactive-ops-dashboard` Vercel project's
deployment history).

When a later session picked this up, the connected GitHub repository
(`erinnogueira17-alt/b-active-extra-mural-dashboard`) turned out to contain
only a generic starter scaffold — none of the real dashboard code. The
original source was not recoverable (no tool access to extract source files
back out of a Vercel deployment). **This version of the app was rebuilt
from scratch** against the architecture described in the original docs,
using honest empty seed data rather than fabricated numbers, and is
deployed via git push from this point forward — see README.md, "Deploying".

## UI notes

- Wide gutters and generous spacing between sections/cards, large KPI
  numbers.
- The Overview/Daily/Weekly/Compare/per-month tab strip in the Enrolment
  board uses **wrapping pill-style buttons** so every tab (including every
  month) is visible without horizontal scrolling.
- The Compare panel has both a **"Month vs month"** and a **"Week vs week"**
  section, using the same comparison-bar component.
- "Year over year" compare is explicitly labeled **not yet available** with
  an honest explanation (only one season of history exists) rather than
  hidden or faked.
