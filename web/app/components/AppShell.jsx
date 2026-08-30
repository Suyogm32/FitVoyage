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
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/progress", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/myworkout", label: "Workout", Icon: Dumbbell },
  { href: "/schedule", label: "Schedule", Icon: CalendarDays },
  { href: "/program", label: "AI Program", Icon: Sparkles },
  { href: "/exercises", label: "Browse exercises", Icon: Search },
  { href: "/settings", label: "Settings", Icon: Settings },
];

const STORAGE_KEY = "befit:sidebar-collapsed";

const AppShell = ({ title: titleOverride, children }) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Pages with dynamic names (an exercise, say) pass their own title; the rest
  // derive it from the nav item they match.
  const title =
    titleOverride ||
    NAV_ITEMS.find((item) => item.href === pathname)?.label ||
    "";

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {}
  }, []);

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
          className="fixed inset-0 bg-foreground/30 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 ${
          collapsed ? "md:w-16" : "md:w-60"
        } bg-card text-card-foreground border-r border-border flex flex-col overflow-y-auto transition-all ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div
          className={`flex items-center px-3 py-3 ${
            collapsed ? "md:justify-center" : "justify-between"
          }`}
        >
          <Link href="/" className="flex items-center pl-1">
            <Logo size={30} wordmark={!collapsed} />
          </Link>
          <button
            className="hidden md:block p-1 rounded hover:bg-muted"
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
            className={`px-3 pb-2 text-xs uppercase tracking-wide text-muted-foreground ${
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
                } ${active ? "" : "hover:bg-muted"}`}
                style={
                  active
                    ? {
                        backgroundColor: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                      }
                    : undefined
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className={collapsed ? "md:hidden" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
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
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                <p className="text-sm truncate">
                  {user.displayName || "Athlete"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "Log out" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm hover:bg-muted ${
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
        <header className="flex items-center gap-3 px-4 md:px-8 py-5 border-b border-border">
          <button
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-2xl flex-1 capitalize">{title}</h1>
          <ThemeToggle />
        </header>
        <main className="px-4 md:px-8 py-6">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
