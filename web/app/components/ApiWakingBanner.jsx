"use client";
import React from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useApiStatus } from "@/lib/useApiStatus";

// Names the cause instead of showing a bare spinner. A visitor who knows the
// server is starting will wait; one staring at an empty page assumes it's
// broken and leaves.
const ApiWakingBanner = () => {
  const status = useApiStatus();

  if (status === "checking" || status === "ready") return null;

  const waking = status === "waking";

  return (
    <div
      className="rounded-xl border border-border p-3.5 flex items-center gap-3"
      style={{
        backgroundColor: waking
          ? "hsl(var(--info) / 0.10)"
          : "hsl(var(--warning) / 0.12)",
      }}
      role="status"
      aria-live="polite"
    >
      {waking ? (
        <Loader2
          size={18}
          className="animate-spin shrink-0"
          style={{ color: "hsl(var(--info))" }}
        />
      ) : (
        <WifiOff
          size={18}
          className="shrink-0"
          style={{ color: "hsl(var(--warning))" }}
        />
      )}
      <p className="text-sm text-muted-foreground">
        {waking
          ? "Waking the server up — it sleeps on free hosting, so the first load can take up to a minute. Exercises will appear shortly."
          : "Can't reach the server right now. Browsing and workouts will be unavailable until it's back."}
      </p>
    </div>
  );
};

export default ApiWakingBanner;