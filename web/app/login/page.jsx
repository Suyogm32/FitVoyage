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
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return null;
  }

  return (
    <div className="bg-LoginBackCol text-black w-screen h-screen flex flex-col justify-center items-center gap-2">
      <div className="w-auto">
        <Login />
      </div>
    </div>
  );
}
