"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { TextField, InputAdornment } from "@mui/material";
import { Eye, EyeOff, Sparkles, TrendingUp, CalendarCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import AuthLayout from "@/app/components/AuthLayout";

const googleProvider = new GoogleAuthProvider();

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2C39.9 35.7 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"
    />
  </svg>
);

const PERKS = [
  { Icon: Sparkles, text: "Programs built around the gear you actually have" },
  {
    Icon: TrendingUp,
    text: "Progression decided from your logs, not a formula",
  },
  {
    Icon: CalendarCheck,
    text: "Change your plan without rewriting your history",
  },
];

const Login = () => {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const setField = (field) => (e) =>
    setLoginData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleGoogleLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/progress");
    } catch (err) {
      console.error("Error occurred during login:", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const checkUser = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password,
      );
      if (!userCredential.user.emailVerified) {
        setError(
          "Please verify your email before logging in — check your inbox for the link.",
        );
        await auth.signOut();
        return;
      }
      router.push("/progress");
    } catch (err) {
      console.error("Error during login:", err);
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError("Failed to log in. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      panelHeading={
        <>
          Welcome back.
          <br />
          Let&apos;s get to work.
        </>
      }
      perks={PERKS}
    >
      <h1 className="text-3xl font-semibold mb-1.5">Log in</h1>
      <p className="text-muted-foreground mb-8">Pick up where you left off.</p>

      <form onSubmit={checkUser} className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          value={loginData.email}
          onChange={setField("email")}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          fullWidth
          value={loginData.password}
          onChange={setField("password")}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </InputAdornment>
            ),
          }}
        />

        {error && (
          <p
            className="text-sm"
            style={{ color: "hsl(var(--destructive))" }}
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-3 rounded-xl font-medium disabled:opacity-60"
          style={{
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-border hover:bg-muted disabled:opacity-50"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <p className="text-sm text-muted-foreground text-center mt-8">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium"
          style={{ color: "hsl(var(--primary))" }}
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
