"use client";
import React, { useState } from "react";
import { Button, Typography } from "@mui/material";
import { BatteryLow, Check } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/app/components/ToastProvider";

const DeloadBanner = ({ advisory, onChanged }) => {
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const respond = async (action) => {
    if (saving) return;
    setSaving(true);
    let succeeded = false;
    try {
      await apiClient.post("/api/coach/advisory", { action });
      succeeded = true;
    } catch (err) {
      console.error("Failed to save advisory response:", err);
      toast.error("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }

    if (succeeded) {
      toast.success(
        action === "accept"
          ? "Deload week noted — go easy."
          : "Dismissed for this week.",
      );
      onChanged?.();
    }
  };

  // Already taking one: a calm reminder, not another prompt.
  if (advisory?.acceptedThisWeek) {
    return (
      <div
        className="rounded-xl border border-border p-4 flex items-start gap-3"
        style={{ backgroundColor: "hsl(var(--success) / 0.10)" }}
      >
        <Check
          size={20}
          style={{ color: "hsl(var(--success))" }}
          className="mt-0.5 shrink-0"
        />
        <div>
          <Typography fontWeight={500}>Deload week</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep the same movements, drop your working weights by around 40% or
            halve your sets. The point is to finish every session feeling like
            you could have done more.
          </Typography>
        </div>
      </div>
    );
  }

  if (!advisory?.recommended || advisory.dismissedThisWeek) return null;

  const reasons = advisory.signals.filter((signal) => signal.met);

  return (
    <div
      className="rounded-xl border border-border p-4"
      // --warning, not the accent: this is an advisory, not a brand moment,
      // and not an error either.
      style={{ backgroundColor: "hsl(var(--warning) / 0.12)" }}
    >
      <div className="flex items-start gap-3">
        <BatteryLow
          size={20}
          style={{ color: "hsl(var(--warning))" }}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <Typography fontWeight={500}>Worth a deload week?</Typography>
          <Typography variant="body2" color="text.secondary" className="mt-0.5">
            A few things line up:
          </Typography>
          <ul className="mt-1.5 mb-3 flex flex-col gap-1">
            {reasons.map((signal) => (
              <li key={signal.id} className="text-sm text-muted-foreground">
                • {signal.detail}
              </li>
            ))}
          </ul>
          <Typography variant="body2" color="text.secondary" className="mb-3">
            Backing off for a week lets fatigue clear so the next block starts
            fresh. Nothing in your schedule changes — this is just a note to
            yourself.
          </Typography>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="small"
              variant="contained"
              color="error"
              disabled={saving}
              onClick={() => respond("accept")}
            >
              Take a deload week
            </Button>
            <Button
              size="small"
              disabled={saving}
              onClick={() => respond("dismiss")}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeloadBanner;
