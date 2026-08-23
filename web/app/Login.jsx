"use client";
import React, { useState } from "react";
import styled from "styled-components";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LoginGrid = styled.div`
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 10px;
`;

const googleProvider = new GoogleAuthProvider();

const Login = () => {
  const initialState = { email: "", password: "" };
  const [loginData, setLoginData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const PutAttribute = (e, attribute) => {
    const newdetails = { ...loginData };
    newdetails[attribute] = e.target.value;
    setLoginData(newdetails);
  };

  const handleGoogleLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (error) {
      console.error("Error occurred during login:", error);
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
      router.push("/");
    } catch (error) {
      console.error("Error during login:", error);
      if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError("Failed to log in. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginGrid>
      <div>
        <img
          src={"/images/LoginPageBanner.jpg"}
          alt="LoginPageBanner"
          className="rounded-lg"
        />
      </div>
      <div className="flex flex-col justify-center items-center gap-4">
        <img
          src={"/images/logo.png"}
          alt="logo"
          className="w-[300px] h-[150px]"
        />
        <div className="flex flex-col justify-center items-center gap-4 border-b-[2px]">
          <input
            type="email"
            placeholder="Email"
            name="email"
            value={loginData.email}
            onChange={(e) => PutAttribute(e, "email")}
            className="p-4 border-s-black border-b-[2px]"
          />
          <input
            type="password"
            placeholder="Password"
            name="password"
            value={loginData.password}
            onChange={(e) => PutAttribute(e, "password")}
            className="p-4 border-s-black border-b-[2px]"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={checkUser}
            disabled={submitting}
            className="bg-white text-black p-2 px-4 rounded-lg"
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </div>
        <button
          className="bg-white text-black p-2 px-4 rounded-lg"
          onClick={handleGoogleLogin}
          disabled={submitting}
        >
          Login with Google
        </button>
        <div className="flex items-center justify-end px-2 m-3">
          Don&apos;t have account yet?,{" "}
          <Link href={"/signup"} className="text-blue-500">
            Sign Up
          </Link>{" "}
        </div>
      </div>
    </LoginGrid>
  );
};

export default Login;
