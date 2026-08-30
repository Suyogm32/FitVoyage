"use client";
import React from "react";
import { Drawer, IconButton, Typography } from "@mui/material";
import { X } from "lucide-react";

// Shared shell for every form in the app. A right-hand drawer rather than a
// centred modal: forms here have several fields, and a drawer keeps the
// page context visible and behaves better on narrow screens.
const SidePanel = ({
  open = true,
  title,
  subtitle,
  onClose,
  footer,
  children,
}) => (
  <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        width: { xs: "100%", sm: 440 },
        backgroundColor: "hsl(var(--card))",
        color: "hsl(var(--card-foreground))",
        // MUI paints a lightening gradient over Paper in dark mode, which
        // fights our token colours.
        backgroundImage: "none",
      },
    }}
  >
    <div className="flex flex-col h-full">
      <header className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="min-w-0">
          <Typography variant="h6">{title}</Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              textTransform="capitalize"
            >
              {subtitle}
            </Typography>
          )}
        </div>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <X size={18} />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4">{children}</div>

      {footer && (
        <div className="p-4 border-t border-border flex justify-end gap-2">
          {footer}
        </div>
      )}
    </div>
  </Drawer>
);

export default SidePanel;
