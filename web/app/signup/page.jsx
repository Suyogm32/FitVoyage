"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../api/Authprovider/Authprovider";
import FitUser from "./FitUser";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/progress");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return <FitUser />;
}
