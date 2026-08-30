"use client";
import React, { Suspense } from "react";
import PageShell from "@/app/components/PageShell";
import ExerciseBrowser from "@/app/components/exercises/ExerciseBrowser";

export default function ExercisesPage() {
  return (
    <PageShell title="Browse exercises">
      {/* useSearchParams needs a Suspense boundary above it in App Router. */}
      <Suspense fallback={null}>
        <ExerciseBrowser />
      </Suspense>
    </PageShell>
  );
}
