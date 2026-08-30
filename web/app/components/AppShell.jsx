"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import {
  Menu,
  X,
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Search,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/progress", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/myworkout", label: "Workout", Icon: Dumbbell },
  { href: "/schedule", label: "Schedule", Icon: CalendarDays },
  { href: "/program", label: "AI Program", Icon: Sparkles },
  { href: "/", label: "Browse exercises", Icon: Search },
  { href: "/settings", label: "Settings", Icon: Settings },
];

const STORAGE_KEY = "befit:sidebar-collapsed";

const AppShell = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const title = NAV_ITEMS.find((item) => item.href === pathname)?.label || "";

  // Read the saved preference after mount rather than in the useState
  // initialiser — localStorage doesn't exist during the server render, and
  // seeding state from it there causes a hydration mismatch.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // Private mode / storage disabled — just stay expanded.
    }
  }, []);

  // Guard lives here rather than in each page — one place that can't be
  // forgotten when a new route joins the group.
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen">
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Fixed at every breakpoint so it stays put while the page scrolls.
          Being out of flow means the content below has to pad itself by the
          matching width. Collapse is desktop-only — the mobile drawer is
          always full width, since an icon rail you have to open helps nobody. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 ${
          collapsed ? "md:w-16" : "md:w-60"
        } bg-white border-r border-black/5 flex flex-col overflow-y-auto transition-all ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div
          className={`flex items-center px-3 py-5 ${
            collapsed ? "md:justify-center" : "justify-between"
          }`}
        >
          <Link href="/" className={collapsed ? "md:hidden" : ""}>
            <img
              src="/images/Logo.png"
              alt="Fit Voyage"
              className="h-14 w-auto pl-2"
            />
          </Link>
          <button
            className="hidden md:block p-1 rounded hover:bg-black/5"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            className="md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3">
          <p
            className={`px-3 pb-2 text-xs uppercase tracking-wide text-black/40 ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            Main menu
          </p>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${active ? "text-white" : "text-black/70 hover:bg-black/5"}`}
                style={
                  active
                    ? { backgroundColor: "hsl(var(--primary))" }
                    : undefined
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className={collapsed ? "md:hidden" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-black/5 p-3">
          {user && (
            <div
              className={`flex items-center gap-3 px-2 py-2 mb-1 min-w-0 ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-9 h-9 rounded-full shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: "hsl(var(--primary))" }}
                >
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                <p className="text-sm truncate">
                  {user.displayName || "Athlete"}
                </p>
                <p className="text-xs text-black/50 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "Log out" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-black/70 hover:bg-black/5 ${
              collapsed ? "md:justify-center md:px-0" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Log out</span>
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-all ${collapsed ? "md:pl-16" : "md:pl-60"}`}
      >
        <header className="flex items-center gap-3 px-4 md:px-8 py-5 border-b border-black/5">
          <button
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-2xl flex-1">{title}</h1>
        </header>
        <main className="px-4 md:px-8 py-6">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
