"use client";
import { useState, useEffect } from "react";

// How long a request may take before we assume the container is asleep
// rather than merely slow.
const WAKING_AFTER_MS = 2500;

// Probes /health rather than a real endpoint: it touches no database, so it
// returns the moment the container is up. A cold start and an outage look
// identical from the outside for the first minute, so this distinguishes
// them by outcome — a resolve means waking, a reject means unreachable.
export const useApiStatus = () => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) {
      setStatus("unreachable");
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setStatus("waking");
    }, WAKING_AFTER_MS);

    // Plain fetch, not apiClient — no auth token needed, and this must work
    // for signed-out visitors on the public homepage.
    fetch(`${base.replace(/\/$/, "")}/health`, { cache: "no-store" })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "ready" : "unreachable");
      })
      .catch(() => {
        if (!cancelled) setStatus("unreachable");
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return status;
};