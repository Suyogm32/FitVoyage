"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import {
  buildMuiTheme,
  ACCENTS,
  STORAGE_KEY_MODE,
  STORAGE_KEY_ACCENT,
} from "@/lib/theme";

const ThemeContext = createContext({
  mode: "system",
  accent: "red",
  setMode: () => {},
  setAccent: () => {},
  resolvedMode: "light",
});

export const useTheme = () => useContext(ThemeContext);

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState("system");
  const [accent, setAccentState] = useState("red");
  const [resolvedMode, setResolvedMode] = useState("light");
  const [ready, setReady] = useState(false);

  // Read stored preferences after mount — localStorage doesn't exist during
  // the server render. The inline script in layout.js has already applied
  // the attributes by now, so there's no flash.
  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(STORAGE_KEY_MODE);
      const storedAccent = window.localStorage.getItem(STORAGE_KEY_ACCENT);
      if (storedMode) setModeState(storedMode);
      if (storedAccent && ACCENTS.includes(storedAccent))
        setAccentState(storedAccent);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    const isDark =
      mode === "dark" || (mode === "system" && systemPrefersDark());
    const root = document.documentElement;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
    root.setAttribute("data-accent", accent);
    setResolvedMode(isDark ? "dark" : "light");
  }, [mode, accent, ready]);

  // Follow the OS while on "system".
  useEffect(() => {
    if (mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const isDark = query.matches;
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
      setResolvedMode(isDark ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = (value) => {
    setModeState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY_MODE, value);
    } catch {}
  };

  const setAccent = (value) => {
    setAccentState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY_ACCENT, value);
    } catch {}
  };

  // Rebuilt whenever the resolved mode or accent changes, so MUI picks up
  // the new computed variable values.
  const muiTheme = useMemo(
    () => buildMuiTheme(resolvedMode === "dark"),
    [resolvedMode, accent],
  );

  return (
    <ThemeContext.Provider
      value={{ mode, accent, setMode, setAccent, resolvedMode }}
    >
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
