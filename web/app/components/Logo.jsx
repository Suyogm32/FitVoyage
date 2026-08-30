"use client";
import React from "react";

// Drawn rather than imported: a PNG can't follow the accent colour, and the
// old one carried a baked-in white background that showed as a light box on
// dark surfaces. The stem-and-two-arms F doubles as a bar chart.
export const LogoMark = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <rect width="32" height="32" rx="9" fill="hsl(var(--primary))" />
    <g fill="hsl(var(--primary-foreground))">
      <rect x="9.5" y="7" width="4" height="18" rx="2" />
      <rect x="9.5" y="7" width="13.5" height="4" rx="2" />
      <rect x="9.5" y="14" width="9" height="4" rx="2" />
    </g>
  </svg>
);

const Logo = ({ size = 32, wordmark = true, className = "" }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <LogoMark size={size} />
    {wordmark && (
      <span
        className="font-semibold tracking-tight leading-none"
        style={{ fontSize: size * 0.58 }}
      >
        Fit<span style={{ color: "hsl(var(--primary))" }}>Voyage</span>
      </span>
    )}
  </span>
);

export default Logo;
