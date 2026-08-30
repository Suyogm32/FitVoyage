"use client";
import React from "react";
import Link from "next/link";
import PublicNavbar from "./PublicNavbar";
import Hero from "./home/Hero";
import FeatureStrip from "./home/FeatureStrip";
import BodyPartGrid from "./home/BodyPartGrid";
import Footer from "./Footer";
import { useAuth } from "@/app/api/Authprovider/Authprovider";

const MyHome = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <Hero />
        <FeatureStrip />
        <BodyPartGrid />

        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
          <div
            className="rounded-3xl border border-border p-10 md:p-16 text-center"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.16), hsl(var(--card)))",
            }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold mb-3">
              The hardest set is the first one.
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Build your first week in a couple of minutes. Change your mind as
              often as you like — your history stays intact.
            </p>
            <Link
              href={user ? "/program" : "/signup"}
              className="inline-block px-6 py-3 rounded-xl font-medium"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {user ? "Build my program" : "Create your free account"}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MyHome;
