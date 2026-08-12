# B-Active Group Ops Dashboard

Internal operations dashboard for B-Active Group. Shows who's currently
enrolled and paying (Current State), the season's trial → enrolment → churn
funnel over time (Enrolment), and a combined at-a-glance summary (Overview).

For the full business/product context, read **`PROJECT_SUMMARY.md`**.

## Stack

- Next.js 15 (App Router), React 18
- Vercel (hosting, Cron Jobs, Blob storage)
- Google Sheets API (service-account auth, manual JWT signing — no
  `googleapis` package)

## Current status

This app was rebuilt from scratch in this repository — a previous attempt's
code never made it into git (see `PROJECT_SUMMARY.md`, "History" section)
and could not be recovered. **No real data has been pulled yet.** The
bundled seed data (`app/data/*.json`) is intentionally all zeros/nulls/empty
arrays, not fabricated numbers — the UI says so plainly via a "Showing seed
data" banner until a real sync succeeds.

The Google Sheets parsing logic (`lib/aggregate.js`,
`lib/currentStateAggregate.js`) is written against **header-keyword
matching** rather than fixed column positions, because this build had no
direct read access to the real sheets to confirm exact layout. **The first
real sync run must be checked carefully** — if the Current State sync
returns `"parsed": false`, or numbers look wrong, the column/section
keyword lists at the top of `lib/currentStateAggregate.js` need adjusting
to match the actual "Live Dashboard 2026" sheet layout.

## Getting set up

### 1. Install and run locally

```bash
npm install
npm run dev
```

Without the environment variables below set, the app runs fine and shows
seed data with a visible "Showing seed data" banner — this is expected, not
an error.

### 2. Environment variables

Set these in the Vercel project (Production scope):

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
CRON_SECRET=...
GOOGLE_SHEET_ID_INTENTIONS=...
GOOGLE_SHEET_ID_ENROLMENTS=...
GOOGLE_SHEET_ID_BLESS=...
GOOGLE_SHEET_ID_LIVE_DASHBOARD=...
```

Unlike a previous attempt at this project, **the four sheet IDs have no
hardcoded fallback in the code** — they must be set as env vars, since the
real IDs weren't available to this build. All seven variables above are
required for a sync to succeed.

The Google service account's email must be added as a **Viewer** on all
four source Google Sheets (three Enrolment forms + the Live Dashboard
sheet).

**After adding or changing any of these, trigger a fresh deployment** — env
var changes don't apply to an already-built deployment.

### 3. Deploying

**Deploy via git, not manual file uploads.** This repo should be connected
to a Vercel project via Vercel's native GitHub integration, so `git push`
triggers a deploy with the complete, correct file tree every time,
automatically. A previous attempt at this project lost significant time to
hand-assembling file lists for one-off deploy tool calls instead — see
`PROJECT_SUMMARY.md`, "History".

In the Vercel dashboard: **Project → Settings → Git** → connect this repo.
Every push to the default branch then deploys automatically. The project
also needs a **Vercel Blob store** connected (Storage → Create Database →
Blob) so `BLOB_READ_WRITE_TOKEN` is auto-injected — without it, sync writes
and blob reads fail gracefully back to seed data.

### 4. Verifying a sync manually

Once env vars are set and deployed, trigger a sync by visiting (in a
browser, with the real `CRON_SECRET` value):

```
https://<your-deployment-url>/api/sync-growth?secret=YOUR_SECRET
https://<your-deployment-url>/api/sync-current-state?secret=YOUR_SECRET
```

Each should return `{"ok": true, "url": "...", "generatedAt": "..."}`. If
either returns an error, check the Vercel function logs — common causes are
a malformed private key (must have real `\n` line breaks, or the code's
`.replace(/\\n/g, "\n")` handles the escaped form), the service account not
having Viewer access to the relevant sheet, or a missing sheet-ID env var.

The two Vercel Cron Jobs (defined in `vercel.json`) call these same
endpoints automatically every night at 00:00 SAST (`0 22 * * *` UTC).

## Project structure

```
package.json                          — deps: next, react, react-dom, @vercel/blob
next.config.mjs                       — empty/default Next config
vercel.json                           — cron schedule for both sync routes
app/layout.js                         — root layout, imports globals.css
app/page.js                           — server component, fetches both boards' data
app/globals.css                       — all styling (light+dark theme, CSS vars)
app/AppShell.jsx                      — top-level board switcher (Overview/Enrolment/Current State)
app/OverviewBoard.jsx                 — combined at-a-glance board
app/EnrolmentBoard.jsx                — Intentions/Enrolments/B-less board (Overview/Daily/Weekly/Compare/per-month tabs)
app/CurrentStateBoard.jsx             — paying players/coaches/schools board
app/data/growth-fallback.json         — honest empty seed data for Enrolment board
app/data/current-state-fallback.json  — honest empty seed data for Current State board
app/api/sync-growth/route.js          — nightly sync: pulls 3 Enrolment sheets → Blob
app/api/sync-current-state/route.js   — nightly sync: pulls Live Dashboard sheet → Blob
lib/aggregate.js                      — Enrolment data aggregation logic (by day/week/month)
lib/currentStateAggregate.js          — Current State roster parsing/aggregation logic
lib/sheetsSync.js                     — low-level Google Sheets API fetch helpers
lib/googleAuth.js                     — manual JWT signing for service-account OAuth
lib/getData.js                        — Blob-fetch-with-fallback helper used by page.js
```

## Data model notes

- The season window is hardcoded as Nov 2025 – Nov 2026 (13 months) in
  `lib/aggregate.js`'s `buildWindowMonths()`. Extending into a second season
  requires updating that function.
- `lib/currentStateAggregate.js`'s `parseSchoolRoster()` detects columns and
  JHB/CPT/Soccer section breaks by keyword, not fixed positions — see
  "Current status" above. Verify it against the real sheet on first sync.
- Enrolment sync tries to auto-detect the 2025 archive tab and 2026 live tab
  by matching "2025"/"2026" in tab titles (`fetchYearCombinedRows` in
  `app/api/sync-growth/route.js`). If a sheet's tabs are named differently,
  this needs updating.
- "Year over year" compare is intentionally not implemented — there's only
  one season of history. Revisit once a second season's data exists.
