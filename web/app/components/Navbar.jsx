"use client";
import React, { useState } from "react";
import Link from "next/link";
import Bars from "../utils/bars";
import styled, { css } from "styled-components";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "../api/Authprovider/Authprovider";
import { useRouter } from "next/navigation";

const StyledNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 15px;
  ${(props) =>
    !props.shownav &&
    css`
      display: none;
    `};
  @media screen and (min-width: 800px) {
    display: flex;
    flex-direction: row;
    position: static;
    justify-content: space-between;
    align-items: center;
  }
`;

const NavButton = styled.button`
  ${(props) =>
    props.shownav &&
    css`
      display: none;
    `};
  @media screen and (min-width: 800px) {
    display: none;
  }
`;

const Navbar = () => {
  const [shownav, setShowNav] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <>
      <div className="flex px-[20px] gap-1 md:gap-3 mt-8 justify-between md:justify-normal">
        <Link href={"/"}>
          <img
            src="/images/Logo.png"
            alt="logo"
            className="w-[100px] h-[40px] md:w-[100px] md:h-[40px] lg:w-[150px] lg:h-[60px]"
          />
        </Link>
        <div className="flex gap-4">
          {user ? (
            <img
              src={user.photoURL}
              alt="User"
              className="md:hidden rounded-full w-[40px] h-[40px]"
            />
          ) : null}
          <NavButton
            shownav={shownav}
            onClick={() => setShowNav((prev) => !prev)}
            className="md:hidden"
          >
            <Bars />
          </NavButton>
          <StyledNav
            shownav={shownav}
            className="mylink"
            onClick={() => setShowNav((prev) => !prev)}
          >
            <button className="md:hidden">
              <Bars />
            </button>
            <Link href={"/"}>Home</Link>
            <Link href={"#exercises"}>Exercises</Link>
            <Link href={"/memberships"}>Memberships</Link>
            <Link href={"/myworkout"}>Workout</Link>
            <Link href={"/schedule"}>Schedule</Link>
            {user ? (
              <button onClick={logout} className="md:hidden">
                Logout
              </button>
            ) : (
              <Link href="/login" className="md:hidden">
                Login
              </Link>
            )}
          </StyledNav>
          <div className="flex gap-2 justify-center items-center">
            {user ? (
              <>
                <img
                  src={user.photoURL}
                  alt="User"
                  className="hidden md:block rounded-full w-[50px] h-[50px]"
                />
                <button onClick={logout} className="hidden md:block">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="hidden md:block">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;