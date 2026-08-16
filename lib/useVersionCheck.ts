"use client";

import { useEffect, useState } from "react";
import { VERSION } from "@/lib/version";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Polls the server's currently-deployed version (periodically, and
// whenever the tab regains focus) and reports whether it has moved past
// the version this page was loaded with.
export function useVersionCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = (await res.json()) as { version?: string };
        if (!cancelled && data.version && data.version !== VERSION) {
          setUpdateAvailable(true);
        }
      } catch {
        // Offline or a transient network hiccup — just try again next tick.
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return updateAvailable;
}
