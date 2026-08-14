"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }
    const verify = async () => {
      try {
        const { data } = await axios.post("/api/verify-email", { token });
        setStatus("success");
        setMessage(data.message);
      } catch (error) {
        setStatus("error");
        setMessage(error.response?.data?.message || "Verification failed.");
      }
    };
    verify();
  }, [token]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-4 bg-LoginBackCol">
      <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 text-center max-w-md">
        {status === "verifying" && <p>Verifying your email...</p>}
        {status !== "verifying" && (
          <>
            <p
              className={`text-lg ${status === "error" ? "text-red-500" : ""}`}
            >
              {message}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="bg-white border text-black p-2 px-4 rounded-lg"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex justify-center items-center">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
