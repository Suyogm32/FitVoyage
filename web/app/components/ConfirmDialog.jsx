"use client";
import React from "react";
import { Dialog, Button, Typography } from "@mui/material";
import { AlertTriangle } from "lucide-react";

const ConfirmDialog = ({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  busy = false,
  onConfirm,
  onClose,
}) => (
  <Dialog
    open
    onClose={busy ? undefined : onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        backgroundColor: "hsl(var(--card))",
        color: "hsl(var(--card-foreground))",
        // MUI paints a lightening gradient over Paper in dark mode.
        backgroundImage: "none",
        p: 1,
      },
    }}
  >
    <div className="p-5">
      <div className="flex gap-3.5">
        {destructive && (
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "hsl(var(--destructive) / 0.13)",
              color: "hsl(var(--destructive))",
            }}
          >
            <AlertTriangle size={19} />
          </span>
        )}
        <div className="min-w-0">
          <Typography variant="h6" className="leading-snug">
            {title}
          </Typography>
          {body && (
            <Typography
              variant="body2"
              color="text.secondary"
              className="mt-1.5"
            >
              {body}
            </Typography>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={busy}
          sx={
            destructive
              ? {
                  backgroundColor: "hsl(var(--destructive))",
                  color: "hsl(var(--destructive-foreground))",
                  "&:hover": {
                    backgroundColor: "hsl(var(--destructive) / 0.9)",
                  },
                }
              : undefined
          }
          color={destructive ? undefined : "error"}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
      </div>
    </div>
  </Dialog>
);

export default ConfirmDialog;
