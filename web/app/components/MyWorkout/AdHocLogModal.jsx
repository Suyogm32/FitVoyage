"use client";
import React, { useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import { Search } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { usesWeightEquipment } from "@/app/utils/weightedEquipment";
import SidePanel from "@/app/components/SidePanel";

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
    <SidePanel
      title="Log an extra exercise"
      subtitle={selected?.name}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!selected || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Log it"}
          </Button>
        </>
      }
    >
      {!selected ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <TextField
              label="Search exercises"
              size="small"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button
              onClick={runSearch}
              disabled={searching}
              aria-label="Search"
            >
              <Search size={18} />
            </Button>
          </div>

          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left w-full"
            >
              <img
                src={ex.gifUrl}
                alt=""
                className="w-12 h-12 rounded bg-white shrink-0"
              />
              <div className="min-w-0">
                <Typography variant="body2" textTransform="capitalize" noWrap>
                  {ex.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  textTransform="capitalize"
                >
                  {ex.bodyPart} · {ex.equipment}
                </Typography>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sets.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <TextField
                label={`Set ${i + 1} reps`}
                type="number"
                size="small"
                fullWidth
                inputProps={{ min: 0 }}
                value={s.reps}
                onChange={(e) => updateSet(i, "reps", e.target.value)}
              />
              {tracksWeight && (
                <TextField
                  label="Weight (kg)"
                  type="number"
                  size="small"
                  placeholder="start light"
                  inputProps={{ step: 0.5, min: 0 }}
                  value={s.weight}
                  onChange={(e) => updateSet(i, "weight", e.target.value)}
                  sx={{ width: 130 }}
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
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => setSets([...sets, { reps: "", weight: "" }])}
            >
              Add set
            </Button>
            <Button size="small" onClick={() => setSelected(null)}>
              Pick a different exercise
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Typography color="error" className="mt-3">
          {error}
        </Typography>
      )}
    </SidePanel>
  );
};

export default AdHocLogModal;
