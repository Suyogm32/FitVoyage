import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl() {
  return (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
}
