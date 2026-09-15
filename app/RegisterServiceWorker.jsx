"use client";

import { useEffect } from "react";

// Registers the passthrough service worker (see public/sw.js) so this
// dashboard qualifies as an installable app ("Add to Home Screen" /
// desktop install) in browsers that require one, without changing what's
// actually shown — see sw.js's own comment for why it never caches.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Best-effort only — an install prompt just won't appear in
        // browsers/contexts where this fails; the dashboard itself still
        // works normally either way.
      });
    }
  }, []);

  return null;
}
