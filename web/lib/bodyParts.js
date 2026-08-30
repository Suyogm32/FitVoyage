"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";

export const useBodyParts = () => {
  const [bodyParts, setBodyParts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/exercisedb/bodyPart")
      .then((res) => {
        if (!cancelled && Array.isArray(res.data)) setBodyParts(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return bodyParts;
};
