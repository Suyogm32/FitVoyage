import React from "react";
import { Sparkles, TrendingUp, CalendarCheck } from "lucide-react";
import { cardClass } from "@/lib/styles";

const FEATURES = [
  {
    Icon: Sparkles,
    title: "A program built around your gear",
    body: "Tell it your goal, your days, and what equipment you can reach. It writes the week from exercises you can actually do.",
  },
  {
    Icon: TrendingUp,
    title: "Progression that reads your logs",
    body: "Hit your targets and the load goes up. Struggle and it holds. Every call is explained, and none of it needs a one-rep max.",
  },
  {
    Icon: CalendarCheck,
    title: "History that stays honest",
    body: "Change your schedule whenever you like. Past workouts keep the targets they were logged against, so your records never rewrite themselves.",
  },
];

const FeatureStrip = () => (
  <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
    <div className="grid md:grid-cols-3 gap-5">
      {FEATURES.map(({ Icon, title, body }) => (
        <div key={title} className={`${cardClass} p-6`}>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
            style={{
              backgroundColor: "hsl(var(--primary) / 0.13)",
              color: "hsl(var(--primary))",
            }}
          >
            <Icon size={21} />
          </div>
          <h3 className="text-lg font-medium mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {body}
          </p>
        </div>
      ))}
    </div>
  </section>
);

export default FeatureStrip;
