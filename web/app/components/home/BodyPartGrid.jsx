"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import apiClient from "@/lib/apiClient";

const BodyPartGrid = () => {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/exercisedb/bodyPart/summary")
      .then((res) => {
        if (!cancelled) setParts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (parts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
      <div className="flex items-end justify-between gap-4 mb-7 flex-wrap">
        <div>
          <h2 className="text-3xl font-semibold mb-1.5">Pick a muscle group</h2>
          <p className="text-muted-foreground">
            No account needed to look around.
          </p>
        </div>
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm hover:opacity-70"
          style={{ color: "hsl(var(--primary))" }}
        >
          See all exercises <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {parts.map(({ bodyPart, count, gifUrl }) => (
          <Link
            key={bodyPart}
            href={`/exercises?bodyPart=${encodeURIComponent(bodyPart)}`}
            className="group rounded-2xl border border-border overflow-hidden bg-card hover:border-[hsl(var(--primary))] transition-colors"
          >
            <img
              src={gifUrl}
              alt=""
              loading="lazy"
              className="w-full aspect-[4/3] object-cover bg-white"
            />
            <div className="p-3.5">
              <p className="capitalize font-medium">{bodyPart}</p>
              <p className="text-xs text-muted-foreground">{count} exercises</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BodyPartGrid;
