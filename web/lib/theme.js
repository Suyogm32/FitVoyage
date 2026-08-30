"use client";
import { createTheme } from "@mui/material/styles";

export const ACCENTS = ["red", "blue", "green", "violet"];
export const MODES = ["light", "dark", "system"];

export const STORAGE_KEY_MODE = "befit:theme-mode";
export const STORAGE_KEY_ACCENT = "befit:theme-accent";

// Mirrors globals.css. Only ever used when getComputedStyle comes back empty:
// during the server render, and on the first client render of a freshly
// compiled route before the stylesheet has been applied. Without these the
// palette gets literal undefined values, which MUI does not backfill — it
// only fills in keys you didn't provide.
const FALLBACKS = {
  light: {
    "--background": "0 0% 97%",
    "--foreground": "240 10% 12%",
    "--card": "0 0% 100%",
    "--muted-foreground": "240 4% 46%",
    "--border": "240 6% 89%",
    "--success": "142 64% 38%",
    "--info": "217 91% 45%",
    "--warning": "38 92% 46%",
  },
  dark: {
    "--background": "240 10% 8%",
    "--foreground": "0 0% 95%",
    "--card": "240 8% 12%",
    "--muted-foreground": "240 5% 65%",
    "--border": "240 6% 22%",
    "--success": "142 52% 50%",
    "--info": "213 88% 62%",
    "--warning": "38 88% 58%",
  },
};

// --primary comes from the accent block, not the mode block, so it has one
// fallback regardless of mode: the default red.
const PRIMARY_FALLBACK = "1 100% 57%";

// Our variables hold bare "H S% L%" triplets so Tailwind can wrap them in
// hsl(var(--x) / <alpha>). MUI's colorManipulator predates that syntax and
// splits hsl() on commas, so a space-separated string silently decomposes to
// NaN. Convert to the comma form MUI can actually parse.
const toMuiHsl = (triplet) => {
  const parts = triplet.split("/")[0].trim().split(/\s+/);
  return parts.length === 3 ? `hsl(${parts.join(", ")})` : triplet;
};

const readVar = (name, isDark, fallback) => {
  let raw = "";
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    raw = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }
  if (!raw) raw = fallback ?? FALLBACKS[isDark ? "dark" : "light"][name];
  return raw ? toMuiHsl(raw) : undefined;
};

// MUI needs real colour values, not var() references — it lightens and
// darkens them internally. So we read the computed CSS variables after the
// attributes are applied, keeping the stylesheet as the single source of
// truth rather than duplicating the palette in JS.
export const buildMuiTheme = (isDark) => {
  const primary = readVar("--primary", isDark, PRIMARY_FALLBACK);

  return createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: { main: primary },
      // The app uses color="error" as brand-red shorthand throughout, so it
      // deliberately points at the accent rather than at a danger colour.
      error: { main: primary },
      success: { main: readVar("--success", isDark) },
      info: { main: readVar("--info", isDark) },
      warning: { main: readVar("--warning", isDark) },
      background: {
        default: readVar("--background", isDark),
        paper: readVar("--card", isDark),
      },
      text: {
        primary: readVar("--foreground", isDark),
        secondary: readVar("--muted-foreground", isDark),
      },
      divider: readVar("--border", isDark),
    },
    shape: { borderRadius: 10 },
  });
};
