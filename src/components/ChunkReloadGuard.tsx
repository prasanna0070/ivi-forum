"use client";

/**
 * Recovers from stale-bundle blank screens after a redeploy.
 *
 * When a new revision ships, its JS chunks get new content-hashed names and the
 * old ones stop existing. A browser tab still holding the previous build then
 * fails to load a chunk on navigation/hydration → React renders nothing (blank
 * page). This listens for those chunk-load failures and does a one-time reload
 * to pull the fresh build. Debounced + capped so a genuinely broken deploy can
 * never cause a tight reload loop.
 */
import { useEffect } from "react";

const CHUNK_ERR =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export default function ChunkReloadGuard() {
  useEffect(() => {
    const recover = () => {
      try {
        const now = Date.now();
        const last = Number(sessionStorage.getItem("__chunk_reload_ts") || 0);
        const count = Number(sessionStorage.getItem("__chunk_reload_n") || 0);
        if (now - last < 8000) return; // debounce rapid re-fires
        if (count >= 3) return; // give up after 3 attempts this session
        sessionStorage.setItem("__chunk_reload_ts", String(now));
        sessionStorage.setItem("__chunk_reload_n", String(count + 1));
        window.location.reload();
      } catch {
        window.location.reload();
      }
    };
    const onError = (e: ErrorEvent) => {
      const msg = e?.message || (e?.error && e.error.message) || "";
      if (CHUNK_ERR.test(msg)) recover();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e?.reason;
      const msg = (r && (r.message || String(r))) || "";
      if (CHUNK_ERR.test(msg)) recover();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
