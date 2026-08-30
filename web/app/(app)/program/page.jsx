"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  MenuItem,
} from "@mui/material";
import { Sparkles, RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useUserProfile } from "@/lib/useUserProfile";
import { useBodyParts } from "@/lib/bodyParts";
import ProgramReview from "@/app/components/program/ProgramReview";
import { useRouter } from "next/navigation";
import { cardClass } from "@/lib/styles";
import { useToast } from "@/app/components/ToastProvider";

const textMuted = { color: "hsl(var(--muted-foreground))" };

const DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

// Rotating status text — a static screen during a 15-60s wait reads as
// frozen. These are honest about the stages, not fake progress.
const STATUS_LINES = [
  "Matching your equipment…",
  "Building your split…",
  "Choosing exercises…",
  "Balancing the week…",
  "Almost there…",
];

const GOAL_LABELS = {
  build_muscle: "build muscle",
  get_stronger: "get stronger",
  general_fitness: "general fitness",
};

const formatResetTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const ProgramPage = () => {
  const { profile } = useUserProfile();
  const bodyParts = useBodyParts();

  // phase: "configure" | "generating" | "review"
  const [phase, setPhase] = useState("configure");
  const [scope, setScope] = useState("week");
  const [targetDay, setTargetDay] = useState("mon");
  const [focus, setFocus] = useState("");
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);
  const statusTimer = useRef(null);

  const router = useRouter();
  const [quota, setQuota] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (phase !== "generating") {
      clearInterval(statusTimer.current);
      return;
    }
    setStatusIndex(0);
    statusTimer.current = setInterval(() => {
      setStatusIndex((prev) => Math.min(prev + 1, STATUS_LINES.length - 1));
    }, 8000);
    return () => clearInterval(statusTimer.current);
  }, [phase]);

  // Read-only — checking your remaining generations must not consume one.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/program/quota")
      .then((res) => {
        if (!cancelled) setQuota(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const trainingProfile = profile?.trainingProfile || {};
  const profileSummary = [
    GOAL_LABELS[trainingProfile.goal],
    trainingProfile.experience,
    trainingProfile.daysPerWeek && `${trainingProfile.daysPerWeek} days/week`,
    (trainingProfile.availableEquipment || []).slice(0, 3).join(", ") ||
      "bodyweight only",
  ]
    .filter(Boolean)
    .join(" · ");

  const profileIncomplete =
    !trainingProfile.goal || !trainingProfile.experience;

  const outOfQuota = quota?.remaining === 0;

  const generate = async () => {
    // Regenerating from the review screen must not cost the user the plan
    // they're already looking at if the second attempt fails.
    const cameFromReview = phase === "review";

    setPhase("generating");
    setError("");
    try {
      const { data } = await apiClient.post("/api/program/generate", {
        scope,
        ...(scope === "day" && { targetDay, focus: focus || null }),
      });
      setGenerated(data);
      if (data.quota) setQuota((prev) => ({ ...prev, ...data.quota }));
      setPhase("review");
    } catch (err) {
      console.error("Generation failed:", err);

      let message;
      if (err.response?.status === 429) {
        const { limit, resetAt } = err.response.data || {};
        setQuota({ limit, remaining: 0, resetAt });
        message = `You've used all ${limit} program generations for today. Your next one unlocks at ${formatResetTime(resetAt)}.`;
      } else if (err.response?.data?.reason === "all_providers_failed") {
        message =
          "Our AI coach is busy right now. Please try again in a few minutes.";
      } else {
        message =
          err.response?.data?.message ||
          "Something went wrong. Please try again.";
      }

      if (cameFromReview) {
        toast.error(message);
        setPhase("review");
      } else {
        setError(message);
        setPhase("configure");
      }
    }
  };

  if (phase === "generating") {
    return (
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-5">
          <RefreshCw
            size={20}
            className="animate-spin"
            style={{ color: "hsl(var(--primary))" }}
          />
          <div>
            <Typography fontWeight={500}>
              {STATUS_LINES[statusIndex]}
            </Typography>
            <Typography variant="caption" sx={textMuted}>
              This can take up to a minute
            </Typography>
          </div>
        </div>
        {/* Skeletons in the shape of the coming day cards */}
        {[3, 2, 3].map((rows, cardIndex) => (
          <div
            key={cardIndex}
            className={`${cardClass} p-4 mb-3 animate-pulse`}
          >
            <div className="h-3.5 w-24 bg-muted rounded mb-4" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted rounded-lg shrink-0" />
                  <div
                    className="h-3 bg-muted rounded"
                    style={{ width: `${75 - rowIndex * 15}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (phase === "review" && generated) {
    return (
      <ProgramReview
        generated={generated}
        scope={scope}
        canRegenerate={!outOfQuota}
        onRegenerate={generate}
        onDiscard={() => setPhase("configure")}
        onApplied={() => router.push("/schedule")}
      />
    );
  }

  return (
    <div className={`${cardClass} p-6 max-w-xl`}>
      <Typography variant="h5" className="mb-1">
        Build your program
      </Typography>
      <Typography variant="body2" sx={textMuted} className="mb-5">
        {profileIncomplete
          ? "Your training profile is incomplete — set your goal and experience in Settings for better results."
          : `Uses your training profile: ${profileSummary}`}
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        color="error"
        value={scope}
        onChange={(e, value) => value && setScope(value)}
        className="mb-4"
      >
        <ToggleButton value="week">Full week</ToggleButton>
        <ToggleButton value="day">Single day</ToggleButton>
      </ToggleButtonGroup>

      <div className="flex gap-3 mb-2">
        <TextField
          select
          label="Day"
          size="small"
          fullWidth
          disabled={scope !== "day"}
          value={targetDay}
          onChange={(e) => setTargetDay(e.target.value)}
        >
          {DAY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Muscle focus"
          size="small"
          fullWidth
          disabled={scope !== "day"}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          sx={{ textTransform: "capitalize" }}
        >
          {bodyParts.map((part) => (
            <MenuItem
              key={part}
              value={part}
              sx={{ textTransform: "capitalize" }}
            >
              {part}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <Typography variant="caption" sx={textMuted} className="block mb-5">
        Day and muscle focus apply when generating a single day
      </Typography>

      {error && (
        <Typography color="error" variant="body2" className="mb-3">
          {error}
        </Typography>
      )}

      <Button
        fullWidth
        variant="contained"
        color="error"
        startIcon={<Sparkles size={16} />}
        onClick={generate}
        disabled={outOfQuota || (scope === "day" && !focus)}
      >
        Generate program
      </Button>

      {quota && (
        <Typography
          variant="caption"
          sx={textMuted}
          className="block mt-3 text-center"
        >
          {quota.remaining > 0
            ? `${quota.remaining} of ${quota.limit} generations left today`
            : `No generations left today — resets at ${formatResetTime(quota.resetAt)}`}
        </Typography>
      )}
    </div>
  );
};

export default ProgramPage;
