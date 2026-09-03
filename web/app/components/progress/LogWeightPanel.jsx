"use client";
import React, { useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import apiClient from "@/lib/apiClient";
import SidePanel from "@/app/components/SidePanel";
import { useToast } from "@/app/components/ToastProvider";

const todayInput = () => new Date().toISOString().slice(0, 10);

const LogWeightPanel = ({ unit = "kg", onClose, onSaved }) => {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const save = async (e) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    let succeeded = false;
    try {
      await apiClient.post("/api/bodyweight", {
        weight: Number(weight),
        unit,
        date,
      });
      succeeded = true;
    } catch (err) {
      console.error("Error saving weight:", err);
      setError(
        err.response?.data?.message || "Couldn't save that. Please try again.",
      );
    } finally {
      setSaving(false);
    }

    if (succeeded) {
      toast.success(`Logged ${weight} ${unit}`);
      onSaved?.();
      onClose();
    }
  };

  return (
    <SidePanel
      title="Log your weight"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={saving || !weight}
            onClick={save}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <TextField
          label={`Weight (${unit})`}
          type="number"
          autoFocus
          fullWidth
          inputProps={{ step: 0.1, min: 0 }}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <TextField
          label="Date"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: todayInput() }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Typography variant="caption" color="text.secondary">
          One entry per day — logging again for the same date replaces it. Weigh
          yourself at the same time of day for a trend worth reading.
        </Typography>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </form>
    </SidePanel>
  );
};

export default LogWeightPanel;
