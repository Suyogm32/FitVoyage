"use client";
import React from "react";
import Link from "next/link";
import Logo from "./Logo";

const Footer = () => (
  <footer className="border-t border-border mt-auto">
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
      <Logo size={28} />
      <nav className="flex gap-6 text-sm text-muted-foreground">
        <Link href="/exercises" className="hover:opacity-70">
          Exercises
        </Link>
        <Link href="/login" className="hover:opacity-70">
          Log in
        </Link>
        <Link href="/signup" className="hover:opacity-70">
          Start free
        </Link>
      </nav>
      <p className="text-sm text-muted-foreground">
        Built by Suyog Mahangade ·{" "}
        <a href="mailto:suyogm32@gmail.com" className="hover:opacity-70">
          suyogm32@gmail.com
        </a>
      </p>
    </div>
  </footer>
);

export default Footer;
