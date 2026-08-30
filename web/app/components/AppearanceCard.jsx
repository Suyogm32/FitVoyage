"use client";
import React from "react";
import { Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ACCENTS } from "@/lib/theme";
import { cardClass } from "@/lib/styles";

const MODE_OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const AppearanceCard = () => {
  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <div className={`${cardClass} p-5`}>
      <Typography variant="h6">Appearance</Typography>
      <Typography
        variant="body2"
        sx={{ color: "hsl(var(--muted-foreground))" }}
        className="mb-4"
      >
        Saved on this device.
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        color="error"
        value={mode}
        onChange={(e, value) => value && setMode(value)}
      >
        {MODE_OPTIONS.map(({ value, label, Icon }) => (
          <ToggleButton key={value} value={value} sx={{ gap: 1, px: 2 }}>
            <Icon size={15} />
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography variant="body2" className="mt-6 mb-2.5">
        Accent colour
      </Typography>
      <div className="flex gap-3">
        {ACCENTS.map((option) => (
          <button
            key={option}
            // data-accent on the swatch itself resolves --primary to that
            // accent's real value, so the preview can't drift from the CSS.
            data-accent={option}
            onClick={() => setAccent(option)}
            aria-label={`${option} accent`}
            className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-105"
            style={{
              backgroundColor: "hsl(var(--primary))",
              borderColor:
                accent === option ? "hsl(var(--foreground))" : "transparent",
            }}
          >
            {accent === option && (
              <Check
                size={16}
                style={{ color: "hsl(var(--primary-foreground))" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AppearanceCard;
