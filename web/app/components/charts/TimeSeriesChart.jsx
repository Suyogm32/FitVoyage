"use client";
import React, { useRef, useState, useEffect, useMemo } from "react";

const PAD = { top: 14, right: 14, bottom: 26, left: 44 };

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

// Hand-rolled rather than a charting dependency: colours come straight from
// the CSS variables, so it themes for free instead of needing computed values
// threaded in as props. Same reasoning as CompletionRing.
const TimeSeriesChart = ({
  points = [],
  unit = "",
  goal = null,
  goalLabel = "Goal",
  height = 220,
  emptyMessage = "Nothing logged yet.",
}) => {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Measured rather than a scaled viewBox, so labels stay the same size at
  // every container width.
  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const model = useMemo(() => {
    if (points.length === 0) return null;

    const sorted = [...points].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const xs = sorted.map((p) => new Date(p.date).getTime());
    const ys = sorted.map((p) => p.value);

    const candidates = goal === null ? ys : [...ys, goal];
    let min = Math.min(...candidates);
    let max = Math.max(...candidates);
    // A flat series would divide by zero; give it a band to sit in.
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const padY = (max - min) * 0.12;
    min -= padY;
    max += padY;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const spanX = maxX - minX || 1;

    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const scaleX = (t) => PAD.left + ((t - minX) / spanX) * innerW;
    const scaleY = (v) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;

    const coords = sorted.map((p, i) => ({
      ...p,
      cx: scaleX(xs[i]),
      cy: scaleY(p.value),
    }));

    return {
      sorted,
      coords,
      scaleY,
      min,
      max,
      innerH,
      line: coords.map((c, i) => `${i ? "L" : "M"}${c.cx},${c.cy}`).join(" "),
      area:
        coords.length > 1
          ? `${coords.map((c, i) => `${i ? "L" : "M"}${c.cx},${c.cy}`).join(" ")} L${coords[coords.length - 1].cx},${PAD.top + innerH} L${coords[0].cx},${PAD.top + innerH} Z`
          : null,
    };
  }, [points, goal, width, height]);

  const onMove = (event) => {
    if (!model) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    model.coords.forEach((c, i) => {
      const distance = Math.abs(c.cx - x);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  if (!model) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const yTicks = [model.max, (model.max + model.min) / 2, model.min];
  const active = hoverIndex === null ? null : model.coords[hoverIndex];
  const showDots = model.coords.length <= 40;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width={width}
        height={height}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Chart"
      >
        {yTicks.map((value, i) => {
          const y = model.scaleY(value);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              >
                {Math.round(value * 10) / 10}
              </text>
            </g>
          );
        })}

        {/* Neutral, not --success. A goal is a reference line, not a reward:
            colouring it green would frame the data series as the "bad" value,
            which is meaningless when the same chart serves someone cutting and
            someone bulking. It also kept status colour out of a picture that
            already uses the accent — a green accent would have collided, and
            red-on-green is the worst pairing for colour blindness. */}
        {goal !== null && (
          <g>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={model.scaleY(goal)}
              y2={model.scaleY(goal)}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={width - PAD.right}
              y={model.scaleY(goal) - 6}
              textAnchor="end"
              style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            >
              {goalLabel}
            </text>
          </g>
        )}

        {model.area && (
          <path d={model.area} fill="hsl(var(--primary) / 0.12)" />
        )}

        <path
          d={model.line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {showDots &&
          model.coords.map((c) => (
            <circle
              key={c.date}
              cx={c.cx}
              cy={c.cy}
              r="3"
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          ))}

        {active && (
          <g>
            <line
              x1={active.cx}
              x2={active.cx}
              y1={PAD.top}
              y2={PAD.top + model.innerH}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={active.cx}
              cy={active.cy}
              r="5"
              fill="hsl(var(--primary))"
            />
          </g>
        )}

        <text
          x={PAD.left}
          y={height - 8}
          style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        >
          {formatDate(model.sorted[0].date)}
        </text>
        {model.sorted.length > 1 && (
          <text
            x={width - PAD.right}
            y={height - 8}
            textAnchor="end"
            style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          >
            {formatDate(model.sorted[model.sorted.length - 1].date)}
          </text>
        )}
      </svg>

      {active && (
        <div
          className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg border border-border bg-card shadow-lg text-xs whitespace-nowrap"
          style={{
            left: Math.min(Math.max(active.cx - 50, 0), width - 110),
            top: Math.max(active.cy - 46, 0),
          }}
        >
          <div className="font-medium">
            {active.value}
            {unit && ` ${unit}`}
          </div>
          <div className="text-muted-foreground">{formatDate(active.date)}</div>
        </div>
      )}
    </div>
  );
};

export default TimeSeriesChart;
