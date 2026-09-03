"use client";
import React, { useState } from "react";
import { Typography, Button } from "@mui/material";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import TimeSeriesChart from "@/app/components/charts/TimeSeriesChart";
import LogWeightPanel from "./LogWeightPanel";
import { useBodyWeight } from "@/lib/useBodyWeight";
import { cardClass } from "@/lib/styles";

const trendVisual = (change) => {
  if (change === null) return { Icon: Minus, token: "--muted-foreground" };
  if (change > 0.1) return { Icon: TrendingUp, token: "--info" };
  if (change < -0.1) return { Icon: TrendingDown, token: "--info" };
  return { Icon: Minus, token: "--muted-foreground" };
};

// Deliberately neutral about direction: gaining isn't bad and losing isn't
// good, it depends entirely on what the person is training for.
const trendText = (change, unit) => {
  if (change === null) return "Not enough history yet";
  if (Math.abs(change) < 0.1) return "Holding steady";
  const direction = change > 0 ? "up" : "down";
  return `${direction} ${Math.abs(change)} ${unit} vs the week before`;
};

const BodyWeightCard = () => {
  const { data, error, loading, reload } = useBodyWeight();
  const [logging, setLogging] = useState(false);

  const unit = data?.unit || "kg";
  const { Icon, token } = trendVisual(data?.trend?.change ?? null);

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <Typography variant="h6">Body weight</Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setLogging(true)}
        >
          Log weight
        </Button>
      </div>

      <div className={`${cardClass} p-5`}>
        {error && <Typography color="error">{error}</Typography>}

        <div className="flex items-baseline gap-4 mb-4 flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-4xl font-bold leading-none"
              style={{ color: "hsl(var(--primary))" }}
            >
              {data?.trend?.latest ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>

          <span
            className="flex items-center gap-1.5 text-sm"
            style={{ color: `hsl(var(${token}))` }}
          >
            <Icon size={16} />
            {trendText(data?.trend?.change ?? null, unit)}
          </span>

          {data?.goalWeight && (
            <span className="text-sm text-muted-foreground ml-auto">
              Goal {data.goalWeight} {unit}
            </span>
          )}
        </div>

        <TimeSeriesChart
          points={(data?.entries || []).map((entry) => ({
            date: entry.date,
            value: entry.weight,
          }))}
          unit={unit}
          goal={data?.goalWeight ?? null}
          goalLabel={`Goal ${data?.goalWeight} ${unit}`}
          emptyMessage={
            loading ? "Loading…" : "Log your weight to start a trend."
          }
        />
      </div>

      {logging && (
        <LogWeightPanel
          unit={unit}
          onClose={() => setLogging(false)}
          onSaved={reload}
        />
      )}
    </section>
  );
};

export default BodyWeightCard;
