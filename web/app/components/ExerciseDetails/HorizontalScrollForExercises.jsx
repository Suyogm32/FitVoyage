"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ExerciseCard from "../homeComponents/Exercise/ExerciseCard";

const SCROLL_STEP = 640;

const HorizontalScrollForExercises = ({ exerciseData, setAddExer }) => {
  // A ref, not getElementById — both rails on this page used the same "slider"
  // id, so the second one's arrows were scrolling the first one.
  const railRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateArrows = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setAtStart(rail.scrollLeft <= 1);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateArrows();
    const rail = railRef.current;
    if (!rail) return;
    rail.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      rail.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, exerciseData]);

  const scrollBy = (direction) => {
    railRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  };

  const arrowClass =
    "p-2 rounded-full border border-border bg-card disabled:opacity-30 disabled:cursor-default hover:bg-muted transition-opacity";

  return (
    <div className="w-full min-w-0">
      <div
        ref={railRef}
        className="flex items-stretch gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
      >
        {exerciseData?.map((exercise) => (
          <div key={exercise.id} className="w-[260px] shrink-0 snap-start">
            <ExerciseCard exercise={exercise} setAddExer={setAddExer} />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <button
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          aria-label="Scroll left"
          className={arrowClass}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          aria-label="Scroll right"
          className={arrowClass}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default HorizontalScrollForExercises;
