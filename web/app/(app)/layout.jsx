"use client";
import AppShell from "@/app/components/AppShell";

// Route-group layout. Because this sits above the pages, it survives
// navigation between them — the sidebar keeps its state instead of
// remounting and re-reading localStorage on every route change.
export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
