// Reads a sync route's response as JSON. If the body isn't JSON (a Vercel
// login page, a platform error page, a plain-text timeout), the returned
// error says which HTTP status came back and a short snippet of what it
// said, instead of a generic "Invalid JSON response" that hides the cause.
export async function readSyncResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return {
      ok: false,
      error: `Sync returned HTTP ${res.status} with a non-JSON response${snippet ? `: ${snippet}` : ""}`,
    };
  }
}
