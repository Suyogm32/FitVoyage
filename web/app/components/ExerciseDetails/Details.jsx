"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Typography } from "@mui/material";
import { Plus, Target, Dumbbell, PersonStanding } from "lucide-react";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import AddExercise from "@/app/AddExercise/AddExercise";
import { cardClass } from "@/lib/styles";

// The dataset ships instructions already prefixed ("Step:1 Lie flat...").
// Rendering them in an <ol> gave two numbering systems at once, so strip the
// baked-in one and let the list own it.
const stripStepPrefix = (text) =>
  String(text).replace(/^\s*step\s*:?\s*\d+\s*[:.)\-]?\s*/i, "");

const Details = ({ exerciseDetail }) => {
  const {
    bodyPart,
    gifUrl,
    name,
    target,
    equipment,
    instructions,
    secondaryMuscles,
  } = exerciseDetail || {};
  const { user } = useAuth();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  if (!name) {
    return (
      <div className="grid lg:grid-cols-[340px_1fr] gap-10">
        <div className="rounded-2xl border border-border bg-card animate-pulse aspect-square" />
        <div className="flex flex-col gap-4">
          <div className="h-10 w-2/3 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const meta = [
    { Icon: PersonStanding, label: "Body part", values: [bodyPart] },
    {
      Icon: Target,
      label: "Muscles worked",
      values: secondaryMuscles?.length
        ? [target, ...secondaryMuscles]
        : [target],
    },
    { Icon: Dumbbell, label: "Equipment", values: [equipment] },
  ];

  const handleAdd = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setAdding(true);
  };

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-8 lg:gap-12 items-start">
      <div className="lg:sticky lg:top-24 flex flex-col gap-4">
        {/* Explicit white behind the gif — dark line art on a transparent
            background disappears on a dark surface. */}
        <div className={`${cardClass} p-4 overflow-hidden`}>
          <img
            src={gifUrl}
            alt={name}
            loading="lazy"
            className="w-full aspect-square object-contain rounded-xl bg-white"
          />
        </div>

        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium"
          style={{
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <Plus size={18} /> Add to my schedule
        </button>
      </div>

      <div>
        <div className="flex flex-col gap-4 mb-10 mt-1">
          {meta.map(({ Icon, label, values }) => (
            <div key={label} className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "hsl(var(--primary) / 0.12)",
                  color: "hsl(var(--primary))",
                }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  {label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {values.filter(Boolean).map((value) => (
                    <span
                      key={value}
                      className="text-sm capitalize px-2.5 py-1 rounded-full border border-border bg-secondary"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Typography variant="h5" className="mb-4">
          Steps to perform
        </Typography>
        <ol className="flex flex-col gap-4">
          {instructions?.map((instruction, index) => (
            <li key={index} className="flex gap-4">
              <span
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                {index + 1}
              </span>
              <p className="leading-relaxed pt-0.5">
                {stripStepPrefix(instruction)}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {adding && (
        <AddExercise
          exerc={exerciseDetail}
          setShowPopup={() => setAdding(false)}
        />
      )}
    </div>
  );
};

export default Details;
