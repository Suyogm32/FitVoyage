"use client";
import React, { useState, useEffect } from "react";
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

const GoalsModal = ({ weeklyGoals = [], onClose, onSaved }) => {
  const [bodyParts, setBodyParts] = useState([]);
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initial = {};
    for (const goal of weeklyGoals) initial[goal.bodyPart] = goal.targetSets;
    setTargets(initial);

    apiClient
      .get("/api/exercisedb/bodyPart")
      .then((res) => setBodyParts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Couldn't load body parts."));
  }, [weeklyGoals]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = Object.entries(targets)
        .map(([bodyPart, targetSets]) => ({
          bodyPart,
          targetSets: Number(targetSets) || 0,
        }))
        .filter((g) => g.targetSets > 0);

      await apiClient.patch("/api/user", { weeklyGoals: payload });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Error saving goals:", err);
      setError("Failed to save your goals. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Weekly training goals</DialogTitle>
      <DialogContent>
        <Typography variant="body2" className="mb-3">
          Target sets per week for each body part. Leave blank for anything you
          don&apos;t want to track.
        </Typography>
        <Stack gap={2} mt={1}>
          {bodyParts.map((bodyPart) => (
            <TextField
              key={bodyPart}
              label={bodyPart}
              type="number"
              size="small"
              inputProps={{ min: 0 }}
              value={targets[bodyPart] ?? ""}
              onChange={(e) =>
                setTargets((prev) => ({ ...prev, [bodyPart]: e.target.value }))
              }
              sx={{ textTransform: "capitalize" }}
            />
          ))}
        </Stack>
        {error && <Typography color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save goals"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoalsModal;
