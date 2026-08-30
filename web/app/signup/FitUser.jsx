"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { TextField, InputAdornment } from "@mui/material";
import {
  Eye,
  EyeOff,
  MailCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import AuthLayout from "@/app/components/AuthLayout";

const PERKS = [
  { Icon: Wallet, text: "Free to start — no card, no trial countdown" },
  {
    Icon: Sparkles,
    text: "Your first week's program written in about a minute",
  },
  {
    Icon: TrendingUp,
    text: "Every session logged feeds the next one's targets",
  },
];

const FitUser = () => {
  const [details, setDetails] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const setField = (field) => (e) =>
    setDetails((prev) => ({ ...prev, [field]: e.target.value }));

  const saveUser = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { name, email, password } = details;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);
      // Signed out on purpose: the account exists but isn't usable until the
      // email is verified, and staying signed in would imply otherwise.
      await signOut(auth);
      setAccountCreated(true);
    } catch (err) {
      console.error("Error creating account:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Failed to create account. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (accountCreated) {
    return (
      <AuthLayout
        panelHeading={
          <>
            One click away.
            <br />
            Check your inbox.
          </>
        }
        perks={PERKS}
      >
        <span
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{
            backgroundColor: "hsl(var(--success) / 0.14)",
            color: "hsl(var(--success))",
          }}
        >
          <MailCheck size={24} />
        </span>

        <h1 className="text-3xl font-semibold mb-2">Account created</h1>
        <p className="text-muted-foreground mb-2">
          We&apos;ve sent a verification link to{" "}
          <span className="text-foreground">{details.email}</span>.
        </p>
        <p className="text-muted-foreground mb-8">
          Click it, then log in. Nothing to set up in the meantime.
        </p>

        <button
          onClick={() => router.push("/login")}
          className="w-full px-4 py-3 rounded-xl font-medium"
          style={{
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          Go to login
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      panelHeading={
        <>
          Start where you are.
          <br />
          Get where you&apos;re going.
        </>
      }
      perks={PERKS}
    >
      <h1 className="text-3xl font-semibold mb-1.5">Create your account</h1>
      <p className="text-muted-foreground mb-8">Takes about thirty seconds.</p>

      <form onSubmit={saveUser} className="flex flex-col gap-4">
        <TextField
          label="Name"
          autoComplete="name"
          fullWidth
          value={details.name}
          onChange={setField("name")}
        />

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          value={details.email}
          onChange={setField("email")}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          fullWidth
          helperText="At least 6 characters"
          value={details.password}
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-8">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium"
          style={{ color: "hsl(var(--primary))" }}
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default FitUser;
