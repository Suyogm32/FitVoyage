"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/exercises", label: "Exercises" },
];

const PublicNavbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const primaryButton = {
    backgroundColor: "hsl(var(--primary))",
    color: "hsl(var(--primary-foreground))",
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Logo size={30} />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:opacity-70">
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/progress"
                className="text-sm px-4 py-2 rounded-lg"
                style={primaryButton}
              >
                Go to dashboard
              </Link>
              <button onClick={logout} className="text-sm hover:opacity-70">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:opacity-70">
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm px-4 py-2 rounded-lg"
                style={primaryButton}
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border px-4 py-4 flex flex-col gap-4">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/progress" onClick={() => setOpen(false)}>
                Go to dashboard
              </Link>
              <button onClick={logout} className="text-left">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                Log in
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)}>
                Start free
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
