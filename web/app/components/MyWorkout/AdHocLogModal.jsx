"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import apiClient from "@/lib/apiClient";
import { usesWeightEquipment } from "@/app/utils/weightedEquipment";

const AdHocLogModal = ({ date, day, onClose, onSaved }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sets, setSets] = useState([{ reps: "", weight: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tracksWeight = selected
    ? usesWeightEquipment(selected.equipment)
    : false;

  const runSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError("");
    try {
      const { data } = await apiClient.get("/api/exercisedb", {
        params: { search: query.trim() },
      });
      setResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Couldn't search exercises right now.");
    } finally {
      setSearching(false);
    }
  };

  const updateSet = (index, field, value) => {
    const next = [...sets];
    next[index] = { ...next[index], [field]: value };
    setSets(next);
  };

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    try {
      // No plan means no target to fall short of, so each set is its own
      // benchmark — targetReps mirrors what was actually done.
      const setsCompleted = sets.map((s, i) => {
        const reps = Number(s.reps) || 0;
        return {
          setNumber: i + 1,
          targetReps: reps,
          repsCompleted: reps,
          ...(tracksWeight && {
            targetWeight: Number(s.weight) || 0,
            weightUsed: Number(s.weight) || 0,
            weightUnit: "kg",
          }),
        };
      });

      await apiClient.post("/api/myschedule", {
        date,
        day,
        exercise_ID: selected.id,
        setsCompleted,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Error logging exercise:", err);
      setError("Failed to log this exercise. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Log an extra exercise</DialogTitle>
      <DialogContent>
        {!selected ? (
          <Stack gap={2} mt={1}>
            <Stack direction="row" gap={1}>
              <TextField
                label="Search exercises"
                size="small"
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
              <Button onClick={runSearch} disabled={searching}>
                {searching ? "..." : "Search"}
              </Button>
            </Stack>
            {results.map((ex) => (
              <div
                key={ex.id}
                onClick={() => setSelected(ex)}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <img
                  src={ex.gifUrl}
                  alt={ex.name}
                  className="w-12 h-12 rounded"
                />
                <div>
                  <Typography textTransform="capitalize">{ex.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ex.bodyPart} · {ex.equipment}
                  </Typography>
                </div>
              </div>
            ))}
          </Stack>
        ) : (
          <Stack gap={2} mt={1}>
            <Typography textTransform="capitalize" variant="h6">
              {selected.name}
            </Typography>
            {sets.map((s, i) => (
              <Stack key={i} direction="row" gap={1} alignItems="center">
                <TextField
                  label={`Set ${i + 1} reps`}
                  type="number"
                  size="small"
                  fullWidth
                  value={s.reps}
                  onChange={(e) => updateSet(i, "reps", e.target.value)}
                />
                {tracksWeight && (
                  <TextField
                    label="Weight (kg)"
                    type="number"
                    size="small"
                    inputProps={{ step: 0.5, min: 0 }}
                    value={s.weight}
                    onChange={(e) => updateSet(i, "weight", e.target.value)}
                    sx={{ width: 140 }}
                  />
                )}
                {sets.length > 1 && (
                  <Button
                    size="small"
                    onClick={() => setSets(sets.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            ))}
            <Button
              size="small"
              onClick={() => setSets([...sets, { reps: "", weight: "" }])}
            >
              Add set
            </Button>
            <Button size="small" onClick={() => setSelected(null)}>
              Pick a different exercise
            </Button>
          </Stack>
        )}
        {error && <Typography color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!selected || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Log it"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdHocLogModal;
