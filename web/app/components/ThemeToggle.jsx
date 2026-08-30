"use client";
import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const ThemeToggle = ({ className = "" }) => {
  const { resolvedMode, setMode } = useTheme();
  const next = resolvedMode === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setMode(next)}
      className={`p-2 rounded-lg hover:bg-muted ${className}`}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {resolvedMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
