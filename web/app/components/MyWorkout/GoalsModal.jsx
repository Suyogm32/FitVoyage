"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button, TextField, Typography, Stack } from "@mui/material";
import apiClient from "@/lib/apiClient";
import SidePanel from "@/app/components/SidePanel";
import { useToast } from "@/app/components/ToastProvider";

const GoalsModal = ({ weeklyGoals = [], onClose, onSaved }) => {
  const [bodyParts, setBodyParts] = useState([]);
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const seeded = useRef(false);
  const toast = useToast();
  // Seed once from the prop. Callers pass weeklyGoals inline, so the array
  // identity changes every parent render — depending on it would refetch the
  // body-part list forever and stomp on whatever the user had typed.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const initial = {};
    for (const goal of weeklyGoals) initial[goal.bodyPart] = goal.targetSets;
    setTargets(initial);
  }, [weeklyGoals]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/exercisedb/bodyPart")
      .then((res) => {
        if (!cancelled) setBodyParts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load body parts.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    let succeeded = false;
    try {
      const payload = Object.entries(targets)
        .map(([bodyPart, targetSets]) => ({
          bodyPart,
          targetSets: Number(targetSets) || 0,
        }))
        .filter((g) => g.targetSets > 0);

      await apiClient.patch("/api/user", { weeklyGoals: payload });
      succeeded = true;
    } catch (err) {
      console.error("Error saving goals:", err);
      setError("Failed to save your goals. Please try again.");
    } finally {
      setSaving(false);
    }
    if (succeeded) {
      toast.success("Weekly goals saved");
      onSaved?.();
      onClose();
    }
  };

  return (
    <SidePanel
      title="Weekly training goals"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save goals"}
          </Button>
        </>
      }
    >
      <Typography variant="body2" color="text.secondary" className="mb-4">
        Target sets per week for each body part. Leave blank for anything you
        don&apos;t want to track.
      </Typography>

      <Stack gap={2}>
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
            sx={{ "& label": { textTransform: "capitalize" } }}
          />
        ))}
      </Stack>

      {error && (
        <Typography color="error" className="mt-3">
          {error}
        </Typography>
      )}
    </SidePanel>
  );
};

export default GoalsModal;
