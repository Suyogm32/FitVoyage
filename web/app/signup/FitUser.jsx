"use client";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import Link from "next/link";

const SignupGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  background-color: #fff;
  border-radius: 10px;
  margin: 0;
  top: 0;
  bottom: 0;
  @media screen and (min-width: 768px) {
    grid-template-columns: 0.8fr 1.2fr;
  }
  @media screen and (min-width: 900px) {
    grid-template-columns: 0.7fr 1.3fr;
  }
`;

const FitUser = () => {
  const initialState = {
    name: "",
    email: "",
    password: "",
  };

  const [FitUserDetails, setFitUserDetails] = useState(initialState);
  const [error, setError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const router = useRouter();

  const PutAttribute = (e, attribute) => {
    const newdetails = { ...FitUserDetails };
    newdetails[attribute] = e.target.value;
    setFitUserDetails(newdetails);
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = { ...FitUserDetails };
      await axios.post("/api/signup", data);
      setAccountCreated(true);
    } catch (error) {
      console.error("Error creating account:", error);
      if (error.response?.status === 409) {
        setError("An account with this email already exists.");
      } else {
        setError("Failed to create account. Please try again later.");
      }
    }
  };

  if (accountCreated) {
    return (
      <div className="flex flex-col gap-4 justify-center items-center p-8 bg-white rounded-xl">
        <img
          src={"/images/logo.png"}
          alt="logo"
          className="w-[300px] h-[150px]"
        />
        <p className="text-lg text-center">
          Your account has been created. Please check your email and click the
          verification link before logging in.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="bg-white border text-black p-2 px-4 rounded-lg"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <SignupGrid>
      <div className="flex flex-col gap-2 justify-start items-center">
        <img
          src={"/images/logo.png"}
          alt="logo"
          className="w-[300px] h-[150px]"
        />
        <input
          type="text"
          placeholder="Username"
          name="name"
          value={FitUserDetails.name}
          onChange={(e) => PutAttribute(e, "name")}
          className="p-4 pb-1 pl-1 border-s-black border-b-[2px]"
        />
        <input
          type="email"
          placeholder="Email"
          name="email"
          value={FitUserDetails.email}
          onChange={(e) => PutAttribute(e, "email")}
          className="p-4 pb-1 pl-1 border-s-black border-b-[2px]"
        />
        <input
          type="password"
          placeholder="Password"
          name="password"
          value={FitUserDetails.password}
          onChange={(e) => PutAttribute(e, "password")}
          className="p-4 pb-1 pl-1 border-s-black border-b-[2px]"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={saveUser}
          className="bg-white text-black p-2 px-4 rounded-lg mt-8"
        >
          Submit
        </button>
        <div className="flex items-center justify-end px-2 m-3 pt-4 border-t-2">
          Already have account?,{" "}
          <Link href={"/login"} className="text-blue-500">
            Login
          </Link>{" "}
        </div>
      </div>
      <div className="flex justify-center">
        <img
          src={"/images/SignupLogoBanner.jpg"}
          alt="SignupPageBanner"
          className="rounded-md hidden md:inline-block"
        />
      </div>
    </SignupGrid>
  );
};

export default FitUser;
