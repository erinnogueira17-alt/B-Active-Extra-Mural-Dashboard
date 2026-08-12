# B-Active Extra Mural Dashboard

A Next.js web app with persisting, database-style storage via **Vercel Blob**.
Data survives refreshes, redeploys, and restarts — no separate database needed
to get started.

## What's in here

- `app/page.js` — dashboard UI (add entries, view a live table)
- `app/api/data/route.js` — API route that reads/writes a JSON dataset to Vercel Blob
- Deployed on Vercel, storage on Vercel Blob

## 1. Push to GitHub

```bash
cd b-active-extra-mural-dashboard
git add .
git commit -m "Initial scaffold: Next.js + Vercel Blob dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/b-active-extra-mural-dashboard.git
git push -u origin main
```

(Create the empty repo first at https://github.com/new — name it
`b-active-extra-mural-dashboard`, no README/gitignore, so the push above works cleanly.)

## 2. Deploy to Vercel

1. Go to https://vercel.com/new and import the GitHub repo.
2. In the new project, go to **Storage -> Create Database -> Blob** and connect
   it to this project. Vercel will auto-inject `BLOB_READ_WRITE_TOKEN`.
3. Deploy. That's it — the app is live and the `/api/data` route can read and
   write persisted JSON via Blob.

## 3. Local development

```bash
npm install
# Pull the Blob token Vercel generated:
vercel env pull .env.local
npm run dev
```

## Next steps

This is a minimal working scaffold: one dataset (`entries`), one form, one
table. From here it's straightforward to extend into the real dashboard —
more fields per entry, filters by school/department, charts, etc. Let Claude
know what data model you actually need for the Extra Mural rollout and it can
build out the real thing on top of this.
