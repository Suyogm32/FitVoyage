"use client";
import React from "react";
import { useAuth } from "@/app/api/Authprovider/Authprovider";
import AppShell from "./AppShell";
import PublicNavbar from "./PublicNavbar";
import Footer from "./Footer";

// One page, two chromes. Signed-in visitors get the sidebar, everyone else
// gets the public navbar — so a route like /exercises can be shared rather
// than existing twice with the same body and different wrappers.
const PageShell = ({ title, children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) return <AppShell title={title}>{children}</AppShell>;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        {title && <h1 className="text-3xl mb-6 capitalize">{title}</h1>}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageShell;
