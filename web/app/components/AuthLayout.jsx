"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";

// Shared shell for /login and /signup. The brand panel is built from tokens
// rather than an illustration, so it follows the accent and works in both
// modes — the old coral banners couldn't.
const AuthLayout = ({ panelHeading, perks = [], children }) => (
  <div className="min-h-screen grid lg:grid-cols-2">
    <div
      className="hidden lg:flex flex-col justify-between p-12 border-r border-border"
      style={{
        background:
          "radial-gradient(110% 110% at 0% 0%, hsl(var(--primary) / 0.20) 0%, hsl(var(--primary) / 0.05) 45%, hsl(var(--card)) 80%)",
      }}
    >
      <Logo size={34} />

      <div className="max-w-md">
        <h2 className="text-4xl font-bold leading-tight mb-8">
          {panelHeading}
        </h2>
        <ul className="flex flex-col gap-5">
          {perks.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-3.5">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "hsl(var(--primary) / 0.13)",
                  color: "hsl(var(--primary))",
                }}
              >
                <Icon size={18} />
              </span>
              <span className="text-muted-foreground pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/exercises"
        className="text-sm text-muted-foreground hover:opacity-70"
      >
        Just browsing? Explore the exercise library →
      </Link>
    </div>

    <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-sm mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:opacity-70 mb-8"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="lg:hidden mb-8">
          <Logo size={32} />
        </div>

        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
