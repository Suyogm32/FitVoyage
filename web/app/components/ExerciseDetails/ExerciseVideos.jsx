"use client";
import React from "react";
import Link from "next/link";
import { Typography } from "@mui/material";
import { Play } from "lucide-react";

const ExerciseVideos = ({ exerciseVideosData, exerciseName }) => {
  const videos = exerciseVideosData?.contents?.slice(0, 3) || [];
  if (videos.length === 0) return null;

  return (
    <section className="mt-16">
      <Typography variant="h5" className="mb-5">
        Watch videos of{" "}
        <span className="capitalize" style={{ color: "hsl(var(--primary))" }}>
          {exerciseName}
        </span>
      </Typography>

      {/* A grid, not a wrapping flex row — the old Stack had a 100px gap, so
          three cards plus gaps exceeded the row and the third wrapped. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map((item, index) => (
          <Link
            key={item.video?.videoId || index}
            href={`https://www.youtube.com/watch?v=${item.video?.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-border bg-card overflow-hidden hover:border-[hsl(var(--primary))] transition-colors"
          >
            <div className="relative">
              <img
                src={item.video?.thumbnails?.[0]?.url}
                alt={item.video?.title}
                loading="lazy"
                className="w-full aspect-video object-cover"
              />
              <span
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: "hsl(240 10% 8% / 0.45)" }}
              >
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  <Play size={20} fill="currentColor" />
                </span>
              </span>
            </div>

            <div className="p-3.5">
              <p className="font-medium leading-snug line-clamp-2">
                {item.video?.title}
              </p>
              {item.video?.channelName && (
                <p className="text-sm text-muted-foreground mt-1.5">
                  {item.video.channelName}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ExerciseVideos;
