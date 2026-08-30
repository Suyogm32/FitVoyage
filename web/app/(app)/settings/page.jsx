"use client";
import React, { useState, useEffect } from "react";
import {
  Typography,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import { useUserProfile } from "@/lib/useUserProfile";
import { cardClass } from "@/lib/styles";
import AppearanceCard from "@/app/components/AppearanceCard";

const textMuted = { color: "hsl(var(--muted-foreground))" };

const GOALS = [
  { value: "build_muscle", label: "Build muscle" },
  { value: "get_stronger", label: "Get stronger" },
  { value: "general_fitness", label: "General fitness" },
];

const EXPERIENCE = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

// Presets cover the common setups so nobody has to tick 28 boxes.
const EQUIPMENT_PRESETS = {
  "Full gym": null, // null means "everything available"
  "Home dumbbells": [
    "dumbbell",
    "body weight",
    "band",
    "resistance band",
    "kettlebell",
    "stability ball",
  ],
  "Bodyweight only": ["body weight"],
};

const SettingsPage = () => {
  const { profile, error, updateProfile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    apiClient
      .get("/api/exercisedb/equipment")
      .then((res) => setEquipmentTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEquipmentTypes([]));
  }, []);

  // Seed the editable draft once the saved profile arrives.
  useEffect(() => {
    if (!profile) return;
    const tp = profile.trainingProfile || {};
    setDraft({
      goal: tp.goal || "",
      experience: tp.experience || "",
      daysPerWeek: tp.daysPerWeek ?? "",
      bodyWeight: tp.bodyWeight ?? "",
      goalWeight: tp.goalWeight ?? "",
      availableEquipment: tp.availableEquipment || [],
    });
  }, [profile]);

  const save = async (changes) => {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateProfile(changes);
    } catch (err) {
      console.error("Error saving settings:", err);
      setSaveError("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveTrainingProfile = () => {
    // Blank fields clear the value rather than failing validation.
    save({
      trainingProfile: {
        goal: draft.goal || null,
        experience: draft.experience || null,
        ...(draft.daysPerWeek !== "" && {
          daysPerWeek: Number(draft.daysPerWeek),
        }),
        bodyWeight: draft.bodyWeight === "" ? null : Number(draft.bodyWeight),
        goalWeight: draft.goalWeight === "" ? null : Number(draft.goalWeight),
        availableEquipment: draft.availableEquipment,
      },
    });
  };

  const toggleEquipment = (item) => {
    setDraft((prev) => ({
      ...prev,
      availableEquipment: prev.availableEquipment.includes(item)
        ? prev.availableEquipment.filter((value) => value !== item)
        : [...prev.availableEquipment, item],
    }));
  };

  const applyPreset = (name) => {
    const preset = EQUIPMENT_PRESETS[name];
    setDraft((prev) => ({
      ...prev,
      availableEquipment: preset === null ? [...equipmentTypes] : preset,
    }));
  };

  if (error) return <Typography color="error">{error}</Typography>;
  if (!profile || !draft)
    return <Typography sx={textMuted}>Loading...</Typography>;

  const unit = profile.preferredWeightUnit || "kg";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <AppearanceCard />
      <div className={`${cardClass} p-5`}>
        <Typography variant="h6">Weight unit</Typography>
        <Typography variant="body2" sx={textMuted} className="mb-3">
          Used as the default when adding weighted exercises.
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="error"
          value={unit}
          onChange={(e, value) => value && save({ preferredWeightUnit: value })}
        >
          <ToggleButton value="kg">kg</ToggleButton>
          <ToggleButton value="lb">lb</ToggleButton>
        </ToggleButtonGroup>
      </div>

      <div className={`${cardClass} p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography variant="h6">Coach mode</Typography>
            <Typography variant="body2" sx={textMuted}>
              Suggests how much weight to lift next session based on your
              history. Adds two quick taps to each workout — how you&apos;re
              feeling that day, and how each exercise went. Off by default.
            </Typography>
          </div>
          <Switch
            color="error"
            checked={Boolean(profile.coachMode)}
            onChange={(e) => save({ coachMode: e.target.checked })}
            disabled={saving}
          />
        </div>
      </div>

      <div className={`${cardClass} p-5`}>
        <Typography variant="h6">Training profile</Typography>
        <Typography variant="body2" sx={textMuted} className="mb-4">
          Used to generate workout programs that fit your goal and setup.
        </Typography>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            select
            label="Goal"
            size="small"
            value={draft.goal}
            onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
          >
            {GOALS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Experience"
            size="small"
            value={draft.experience}
            onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
          >
            {EXPERIENCE.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Training days per week"
            type="number"
            size="small"
            inputProps={{ min: 1, max: 7 }}
            value={draft.daysPerWeek}
            onChange={(e) =>
              setDraft({ ...draft, daysPerWeek: e.target.value })
            }
          />

          <div />

          <TextField
            label={`Current body weight (${unit})`}
            type="number"
            size="small"
            inputProps={{ min: 0, step: 0.5 }}
            value={draft.bodyWeight}
            onChange={(e) => setDraft({ ...draft, bodyWeight: e.target.value })}
          />

          <TextField
            label={`Goal body weight (${unit})`}
            type="number"
            size="small"
            inputProps={{ min: 0, step: 0.5 }}
            value={draft.goalWeight}
            onChange={(e) => setDraft({ ...draft, goalWeight: e.target.value })}
          />
        </div>

        <div className="mt-6">
          <Typography variant="body2" className="mb-2">
            Equipment you can use
          </Typography>
          <div className="flex gap-2 flex-wrap mb-3">
            {Object.keys(EQUIPMENT_PRESETS).map((name) => (
              <Button
                key={name}
                size="small"
                variant="outlined"
                onClick={() => applyPreset(name)}
              >
                {name}
              </Button>
            ))}
            <Button
              size="small"
              onClick={() => setDraft({ ...draft, availableEquipment: [] })}
            >
              Clear
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 max-h-56 overflow-y-auto pr-2">
            {equipmentTypes.map((item) => (
              <FormControlLabel
                key={item}
                control={
                  <Checkbox
                    size="small"
                    color="error"
                    checked={draft.availableEquipment.includes(item)}
                    onChange={() => toggleEquipment(item)}
                  />
                }
                label={<span className="text-sm capitalize">{item}</span>}
              />
            ))}
          </div>
          <Typography variant="caption" sx={textMuted}>
            {draft.availableEquipment.length} selected
          </Typography>
        </div>

        <div className="mt-5">
          <Button
            variant="contained"
            color="error"
            disabled={saving}
            onClick={saveTrainingProfile}
          >
            {saving ? "Saving..." : "Save training profile"}
          </Button>
        </div>
      </div>

      {saveError && <Typography color="error">{saveError}</Typography>}
    </div>
  );
};

export default SettingsPage;
