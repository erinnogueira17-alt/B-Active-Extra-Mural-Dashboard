import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readSyncResponse } from "./syncResponse.js";

test("reads a JSON sync body unchanged", async () => {
  const res = new Response(JSON.stringify({ ok: true, generatedAt: "2026-11-02" }), { status: 200 });
  assert.deepEqual(await readSyncResponse(res), { ok: true, generatedAt: "2026-11-02" });
});

test("explains an HTML login page with its status and a readable snippet", async () => {
  const html = "<html><head><style>body{}</style></head><body><h1>Log in to Vercel</h1></body></html>";
  const res = new Response(html, { status: 401, headers: { "content-type": "text/html" } });
  const body = await readSyncResponse(res);
  assert.equal(body.ok, false);
  assert.match(body.error, /HTTP 401/);
  assert.match(body.error, /Log in to Vercel/);
  assert.doesNotMatch(body.error, /<|body\{/);
});

test("manual sync calls the sync handlers in-process, not over the public URL", async () => {
  const src = await readFile(new URL("../app/api/manual-sync/route.js", import.meta.url), "utf8");
  assert.match(src, /GET as syncGrowth/);
  assert.match(src, /GET as syncCurrentState/);
  assert.doesNotMatch(src, /\bfetch\(/, "manual-sync must not fetch the deployment's own URL");
});
