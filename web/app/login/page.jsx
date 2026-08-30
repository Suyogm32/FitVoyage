"use client";
import React, { useEffect } from "react";
import { useAuth } from "../api/Authprovider/Authprovider";
import { useRouter } from "next/navigation";
import Login from "../Login";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/progress");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return null;
  }

  return <Login />;
}
