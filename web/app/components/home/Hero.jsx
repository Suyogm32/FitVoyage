"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

const Hero = () => {
  const { user } = useAuth();
  const [preview, setPreview] = useState([]);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/exercisedb/browse", { params: { limit: 3 } })
      .then((res) => {
        if (cancelled) return;
        setPreview(res.data?.items || []);
        setTotal(res.data?.total ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 md:pt-16">
      <div
        className="rounded-3xl border border-border overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, hsl(var(--primary) / 0.16) 0%, hsl(var(--primary) / 0.04) 45%, hsl(var(--card)) 78%)",
        }}
      >
        <div className="grid lg:grid-cols-2 gap-10 items-center p-8 md:p-14">
          <div>
            <span
              className="inline-block text-xs tracking-wide uppercase px-3 py-1 rounded-full mb-6"
              style={{
                backgroundColor: "hsl(var(--primary) / 0.15)",
                color: "hsl(var(--primary))",
              }}
            >
              Your training, on autopilot
            </span>

            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] mb-5">
              Stop guessing.
              <br />
              Start progressing.
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mb-8">
              Build a week that fits the gear you actually have, log every set,
              and let the coach decide what goes up next. No spreadsheets, no
              one-rep-max maths.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/exercises"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium"
                style={{
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                Browse exercises <ArrowRight size={17} />
              </Link>
              <Link
                href={user ? "/progress" : "/signup"}
                className="inline-flex items-center px-5 py-3 rounded-xl font-medium border border-border hover:bg-muted"
              >
                {user ? "Go to my dashboard" : "Start free"}
              </Link>
            </div>

            <div className="flex gap-8 mt-10 pt-8 border-t border-border">
              <div>
                <p className="text-2xl font-semibold">
                  {total ? total.toLocaleString() : "1,300"}+
                </p>
                <p className="text-sm text-muted-foreground">Exercises</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">10</p>
                <p className="text-sm text-muted-foreground">Muscle groups</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">£0</p>
                <p className="text-sm text-muted-foreground">To start</p>
              </div>
            </div>
          </div>

          {/* Real catalogue gifs rather than a stock photo — nothing to clash
              with the theme, and it shows the actual product. */}
          <div className="hidden lg:flex justify-center items-center gap-4 h-[420px]">
            {preview.map((exercise, index) => (
              <div
                key={exercise.id}
                className="rounded-2xl overflow-hidden border border-border shadow-lg bg-white w-[190px]"
                style={{
                  transform: `translateY(${index === 1 ? "-28px" : "18px"}) rotate(${
                    index === 0 ? "-4deg" : index === 2 ? "4deg" : "0deg"
                  })`,
                }}
              >
                <img
                  src={exercise.gifUrl}
                  alt={exercise.name}
                  className="w-full aspect-square object-cover"
                />
                <p className="text-xs capitalize text-center py-2.5 text-[hsl(var(--card-foreground))] bg-card">
                  {exercise.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
